from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe
from app.database import get_db
from app.config import settings
from app.models.order import Order, PaymentStatus
from app.middleware.auth_middleware import get_current_user
from app.models.user import User

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-intent")
async def create_payment_intent(
    payment_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe PaymentIntent for an order
    
    Expected payment_data:
    {
        "amount": 100.50,
        "order_id": "uuid",
        "currency": "usd"
    }
    """
    try:
        amount = payment_data.get('amount')
        order_id = payment_data.get('order_id')
        currency = payment_data.get('currency', 'usd')
        
        if not amount or not order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount and order_id are required"
            )
        
        # Verify order exists and belongs to user
        order = db.query(Order).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        if order.buyer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Create PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=int(float(amount) * 100),  # Convert to cents
            currency=currency,
            metadata={
                "order_id": str(order_id),
                "user_id": str(current_user.id),
                "user_email": current_user.email
            },
            automatic_payment_methods={
                "enabled": True,
            }
        )
        
        # Save payment intent ID to order
        order.stripe_payment_intent_id = intent.id
        db.commit()
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment intent creation failed: {str(e)}"
        )


@router.post("/confirm")
async def confirm_payment(
    confirmation_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm payment and update order status
    
    Expected confirmation_data:
    {
        "payment_intent_id": "pi_xxx",
        "order_id": "uuid"
    }
    """
    try:
        payment_intent_id = confirmation_data.get('payment_intent_id')
        order_id = confirmation_data.get('order_id')
        
        if not payment_intent_id or not order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="payment_intent_id and order_id are required"
            )
        
        # Verify order
        order = db.query(Order).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        if order.buyer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Retrieve PaymentIntent from Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == 'succeeded':
            # Update order payment status
            order.payment_status = PaymentStatus.PAID
            order.stripe_payment_intent_id = payment_intent_id
            db.commit()
            
            return {
                "success": True,
                "message": "Payment confirmed successfully",
                "order_id": str(order_id)
            }
        else:
            return {
                "success": False,
                "message": f"Payment status: {payment_intent.status}",
                "status": payment_intent.status
            }
            
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment confirmation failed: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhooks for payment events
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        
        # Get order from metadata
        order_id = payment_intent.get('metadata', {}).get('order_id')
        
        if order_id:
            order = db.query(Order).filter(Order.id == order_id).first()
            if order:
                order.payment_status = PaymentStatus.PAID
                order.stripe_payment_intent_id = payment_intent['id']
                db.commit()
                
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        
        # Get order from metadata
        order_id = payment_intent.get('metadata', {}).get('order_id')
        
        if order_id:
            order = db.query(Order).filter(Order.id == order_id).first()
            if order:
                order.payment_status = PaymentStatus.FAILED
                db.commit()
    
    return {"status": "success"}


@router.get("/public-key")
async def get_public_key():
    """Get Stripe public key for frontend"""
    return {
        "public_key": settings.STRIPE_PUBLIC_KEY
    }
