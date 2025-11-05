from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe
from app.database import get_db
from app.config import settings
from app.models.order import Order, PaymentStatus, OrderStatus
from app.models.product import Product
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
        
        # VALIDATION 1: Check if order is already paid
        if order.payment_status == PaymentStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This order has already been paid"
            )
        
        # VALIDATION 2: Check if order is in a valid state for payment
        if order.status not in [OrderStatus.PENDING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot process payment for order with status: {order.status}"
            )
        
        # VALIDATION 3: Verify amount matches order total
        if abs(float(amount) - float(order.total)) > 0.01:  # Allow 1 cent difference for rounding
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount mismatch. Expected: {order.total}, Received: {amount}"
            )
        
        # VALIDATION 4: Check if there's already a pending payment intent
        if order.stripe_payment_intent_id:
            try:
                # Check existing payment intent status
                existing_intent = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
                
                # If existing intent is still pending, return it instead of creating new one
                if existing_intent.status in ['requires_payment_method', 'requires_confirmation', 'requires_action']:
                    return {
                        "client_secret": existing_intent.client_secret,
                        "payment_intent_id": existing_intent.id,
                        "message": "Using existing payment intent"
                    }
                
                # If succeeded, update order status
                if existing_intent.status == 'succeeded':
                    order.payment_status = PaymentStatus.PAID
                    db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This order has already been paid"
                    )
            except stripe.error.InvalidRequestError:
                # Payment intent doesn't exist anymore, create new one
                pass
        
        # Create PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=int(float(amount) * 100),  # Convert to cents
            currency=currency,
            metadata={
                "order_id": str(order_id),
                "order_number": order.order_number,
                "user_id": str(current_user.id),
                "user_email": current_user.email
            },
            automatic_payment_methods={
                "enabled": True,
            },
            description=f"Order {order.order_number}"
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
    except HTTPException:
        raise
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
        
        # VALIDATION 1: Check if already paid
        if order.payment_status == PaymentStatus.PAID:
            return {
                "success": True,
                "message": "Payment already confirmed",
                "order_id": str(order_id),
                "order_number": order.order_number
            }
        
        # VALIDATION 2: Verify payment intent belongs to this order
        if order.stripe_payment_intent_id and order.stripe_payment_intent_id != payment_intent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment intent ID does not match order"
            )
        
        # Retrieve PaymentIntent from Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        # VALIDATION 3: Verify payment intent metadata matches order
        if payment_intent.metadata.get('order_id') != str(order_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment intent does not belong to this order"
            )
        
        if payment_intent.status == 'succeeded':
            # Update order payment status
            order.payment_status = PaymentStatus.PAID
            order.status = OrderStatus.CONFIRMED
            order.stripe_payment_intent_id = payment_intent_id
            
            # Update all order items to confirmed
            for item in order.items:
                if item.status == OrderStatus.PENDING:
                    item.status = OrderStatus.CONFIRMED
            
            db.commit()
            
            # Send confirmation emails
            from app.services.email_service import email_service
            
            # Prepare order data for email
            buyer_name = f"{order.buyer.first_name or ''} {order.buyer.last_name or ''}".strip() or "Customer"
            
            order_data = {
                'id': str(order.id),
                'order_number': order.order_number,
                'order_date': order.created_at.strftime('%B %d, %Y'),
                'payment_method': order.payment_method or 'Card',
                'buyer_name': buyer_name,
                'customer_name': buyer_name,
                'customer_email': order.buyer.email,  # Added for seller email
                'subtotal': float(order.subtotal),
                'shipping': float(order.shipping_cost),
                'tax': float(order.tax),
                'total': float(order.total),
                'shipping_address': order.shipping_address,
                'items': []
            }
            
            # Group items by seller
            sellers_items = {}
            for item in order.items:
                order_data['items'].append({
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'subtotal': float(item.subtotal),
                    'seller_earning': float(item.seller_earning),
                    'platform_fee': float(item.platform_fee)
                })
                
                # Group by seller for seller notifications
                if item.seller_id not in sellers_items:
                    sellers_items[item.seller_id] = []
                sellers_items[item.seller_id].append({
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'subtotal': float(item.subtotal),
                    'seller_earning': float(item.seller_earning),
                    'platform_fee': float(item.platform_fee)
                })
            
            # Send buyer confirmation email
            try:
                await email_service.send_order_confirmation_email(
                    to_email=order.buyer.email,
                    order_data=order_data
                )
            except Exception as e:
                print(f"Failed to send order confirmation email: {e}")
            
            # Send seller notification emails
            from app.models.seller import SellerProfile
            for seller_id, items in sellers_items.items():
                try:
                    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
                    if seller and seller.user:
                        seller_order_data = order_data.copy()
                        seller_order_data['items'] = items
                        seller_name = seller.business_name or seller.user.email.split('@')[0]
                        
                        await email_service.send_seller_new_order_email(
                            to_email=seller.user.email,
                            seller_name=seller_name,
                            order_data=seller_order_data
                        )
                except Exception as e:
                    print(f"Failed to send seller notification: {e}")
            
            return {
                "success": True,
                "message": "Payment confirmed successfully",
                "order_id": str(order_id),
                "order_number": order.order_number,
                "amount_paid": float(payment_intent.amount) / 100,
                "currency": payment_intent.currency
            }
        elif payment_intent.status == 'requires_payment_method':
            return {
                "success": False,
                "message": "Payment method required",
                "status": payment_intent.status,
                "requires_action": True
            }
        elif payment_intent.status == 'requires_action':
            return {
                "success": False,
                "message": "Additional authentication required",
                "status": payment_intent.status,
                "requires_action": True
            }
        elif payment_intent.status in ['canceled', 'failed']:
            order.payment_status = PaymentStatus.FAILED
            db.commit()
            return {
                "success": False,
                "message": f"Payment {payment_intent.status}",
                "status": payment_intent.status
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
    except HTTPException:
        raise
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
    
    Automatically updates order status when payments are processed.
    This runs asynchronously outside the normal payment flow.
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
                # Only update if not already paid (idempotency)
                if order.payment_status != PaymentStatus.PAID:
                    order.payment_status = PaymentStatus.PAID
                    order.status = OrderStatus.CONFIRMED
                    order.stripe_payment_intent_id = payment_intent['id']
                    
                    # Update order items
                    for item in order.items:
                        if item.status == OrderStatus.PENDING:
                            item.status = OrderStatus.CONFIRMED
                    
                    db.commit()
                    
                    # TODO: Send confirmation emails
                    # send_order_confirmation_email(order)
                    # send_seller_new_order_notifications(order)
                    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        
        # Get order from metadata
        order_id = payment_intent.get('metadata', {}).get('order_id')
        
        if order_id:
            order = db.query(Order).filter(Order.id == order_id).first()
            if order:
                order.payment_status = PaymentStatus.FAILED
                db.commit()
                
                # TODO: Send payment failed email
                # send_payment_failed_email(order)
    
    elif event['type'] == 'payment_intent.canceled':
        payment_intent = event['data']['object']
        
        order_id = payment_intent.get('metadata', {}).get('order_id')
        
        if order_id:
            order = db.query(Order).filter(Order.id == order_id).first()
            if order:
                # Mark as failed (user can try again)
                order.payment_status = PaymentStatus.FAILED
                db.commit()
    
    elif event['type'] == 'charge.refunded':
        charge = event['data']['object']
        payment_intent_id = charge.get('payment_intent')
        
        if payment_intent_id:
            # Find order by payment intent ID
            order = db.query(Order).filter(
                Order.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if order:
                order.payment_status = PaymentStatus.REFUNDED
                order.status = OrderStatus.REFUNDED
                
                # Restore inventory
                for item in order.items:
                    item.status = OrderStatus.REFUNDED
                    product = db.query(Product).filter(
                        Product.id == item.product_id
                    ).first()
                    if product:
                        product.quantity += item.quantity
                        product.sales_count = max(0, product.sales_count - item.quantity)
                
                db.commit()
                
                # TODO: Send refund confirmation email
                # send_refund_confirmation_email(order)
    
    return {"status": "success"}


@router.get("/public-key")
async def get_public_key():
    """Get Stripe public key for frontend"""
    return {
        "public_key": settings.STRIPE_PUBLIC_KEY
    }
