import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, Loader2, Plus } from 'lucide-react';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import toast from 'react-hot-toast';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compare_at_price: '',
    category_id: '',
    quantity: '',
    sku: '',
    low_stock_threshold: 5,
    is_active: true,
    is_featured: false,
    is_digital: false,
  });

  useEffect(() => {
    fetchCategories();
    fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const fetchProduct = async () => {
    try {
      const data = await productService.getProduct(id);
      
      setFormData({
        name: data.name,
        description: data.description || '',
        price: data.price,
        compare_at_price: data.compare_at_price || '',
        category_id: data.category_id,
        quantity: data.quantity,
        sku: data.sku || '',
        low_stock_threshold: data.low_stock_threshold || 5,
        is_active: data.is_active,
        is_featured: data.is_featured,
        is_digital: data.is_digital || false,
      });
      
      // Convert existing images to the format we need
      const existingImages = data.images?.map((img, index) => ({
        image_url: img.image_url,
        alt_text: img.alt_text || '',
        position: img.position || index,
        is_primary: img.is_primary,
      })) || [];
      
      setImages(existingImages.length > 0 ? existingImages : [{ 
        image_url: '', 
        alt_text: '', 
        position: 0, 
        is_primary: true 
      }]);
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/seller/products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (index, field, value) => {
    const newImages = [...images];
    newImages[index][field] = value;
    setImages(newImages);
  };

  const addImageField = () => {
    if (images.length >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages([
      ...images,
      { image_url: '', alt_text: '', position: images.length, is_primary: false },
    ]);
  };

  const removeImageField = (index) => {
    if (images.length === 1) {
      toast.error('At least one image is required');
      return;
    }
    const newImages = images.filter((_, i) => i !== index);
    // Reorder positions
    const reorderedImages = newImages.map((img, i) => ({ ...img, position: i }));
    setImages(reorderedImages);
  };

  const setPrimaryImage = (index) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    setImages(newImages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }
    if (parseFloat(formData.price) <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (parseInt(formData.quantity) < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    // Filter out empty image URLs
    const validImages = images.filter((img) => img.image_url.trim() !== '');
    if (validImages.length === 0) {
      toast.error('Please add at least one product image');
      return;
    }

    // Ensure at least one image is marked as primary
    const hasPrimary = validImages.some(img => img.is_primary);
    if (!hasPrimary) {
      validImages[0].is_primary = true;
    }

    setSaving(true);

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        category_id: formData.category_id,
        quantity: parseInt(formData.quantity),
        sku: formData.sku || null,
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        is_digital: formData.is_digital,
        images: validImages,
      };

      await productService.updateProduct(id, updateData);
      toast.success('Product updated successfully!');
      navigate('/seller/products');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/seller/products"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Products
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-600 mt-2">Update your product information</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
            
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Wireless Bluetooth Headphones"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="5"
                  className="input-field"
                  placeholder="Describe your product features, benefits, specifications..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Pricing</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price * ($)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Compare at Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compare at Price ($)
                  <span className="text-gray-500 text-xs ml-2">(Optional - for showing discounts)</span>
                </label>
                <input
                  type="number"
                  name="compare_at_price"
                  value={formData.compare_at_price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Inventory</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  className="input-field"
                  placeholder="0"
                  required
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU
                  <span className="text-gray-500 text-xs ml-2">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., WBH-001"
                />
              </div>

              {/* Low Stock Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleChange}
                  min="0"
                  className="input-field"
                  placeholder="5"
                />
              </div>
            </div>

            {/* Digital Product */}
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_digital"
                  checked={formData.is_digital}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  This is a digital product (no shipping required)
                </span>
              </label>
            </div>
          </div>

          {/* Images */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Product Images</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add image URLs for your product. Mark one as the primary image to be displayed first.
            </p>

            <div className="space-y-4">
              {images.map((image, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-grow space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image URL {index === 0 && '*'}
                        </label>
                        <input
                          type="url"
                          required={index === 0}
                          value={image.image_url}
                          onChange={(e) => handleImageChange(index, 'image_url', e.target.value)}
                          className="input-field"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alt Text (Optional)
                        </label>
                        <input
                          type="text"
                          value={image.alt_text}
                          onChange={(e) => handleImageChange(index, 'alt_text', e.target.value)}
                          className="input-field"
                          placeholder="Describe the image for accessibility"
                        />
                      </div>

                      {/* Preview */}
                      {image.image_url && (
                        <div className="mt-2">
                          <img
                            src={image.image_url}
                            alt={image.alt_text || `Product ${index + 1}`}
                            className="w-32 h-32 object-cover rounded border border-gray-300"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/300x300?text=Invalid+Image';
                            }}
                          />
                        </div>
                      )}
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="primary_image"
                          checked={image.is_primary}
                          onChange={() => setPrimaryImage(index)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Set as primary image
                          {image.is_primary && (
                            <span className="ml-2 text-xs text-primary-600 font-medium">
                              (Currently primary)
                            </span>
                          )}
                        </span>
                      </label>
                    </div>

                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="Remove image"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {images.length < 5 && (
                <button
                  type="button"
                  onClick={addImageField}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Another Image ({images.length}/5)
                </button>
              )}
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Visibility</h2>
            
            <div className="space-y-4">
              {/* Active Status */}
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">
                    Active
                  </span>
                  <span className="block text-sm text-gray-500">
                    Make this product visible to customers in your store
                  </span>
                </span>
              </label>

              {/* Featured Status */}
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">
                    Featured
                  </span>
                  <span className="block text-sm text-gray-500">
                    Highlight this product on your store front page
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pb-8">
            <Link
              to="/seller/products"
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;
