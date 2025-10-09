import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import toast from 'react-hot-toast';

const CreateProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([{ image_url: '', alt_text: '', position: 0, is_primary: true }]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    compare_at_price: '',
    sku: '',
    quantity: 0,
    low_stock_threshold: 5,
    is_digital: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleImageChange = (index, field, value) => {
    const newImages = [...images];
    newImages[index][field] = value;
    setImages(newImages);
  };

  const addImageField = () => {
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
    setImages(newImages);
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
    setLoading(true);

    try {
      // Filter out empty image URLs
      const validImages = images.filter((img) => img.image_url.trim() !== '');

      if (validImages.length === 0) {
        toast.error('Please add at least one product image');
        setLoading(false);
        return;
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        quantity: parseInt(formData.quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        images: validImages,
      };

      await productService.createProduct(productData);
      toast.success('Product created successfully!');
      navigate('/seller/products');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => navigate('/seller/products')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Products
        </button>

        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Add New Product</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., iPhone 15 Pro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="input-field"
                    rows="4"
                    placeholder="Describe your product..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category_id"
                    required
                    value={formData.category_id}
                    onChange={handleChange}
                    className="input-field"
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
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Pricing</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compare at Price (Original)
                  </label>
                  <input
                    type="number"
                    name="compare_at_price"
                    step="0.01"
                    min="0"
                    value={formData.compare_at_price}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Show a discount by setting a higher original price
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Inventory</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU (Optional)
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="PROD-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    name="low_stock_threshold"
                    min="0"
                    value={formData.low_stock_threshold}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_digital"
                    checked={formData.is_digital}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    This is a digital product (no shipping required)
                  </span>
                </label>
              </div>
            </div>

            {/* Images */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Product Images</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add image URLs for your product. The first image will be the primary image.
              </p>

              <div className="space-y-4">
                {images.map((image, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
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
                            Alt Text
                          </label>
                          <input
                            type="text"
                            value={image.alt_text}
                            onChange={(e) => handleImageChange(index, 'alt_text', e.target.value)}
                            className="input-field"
                            placeholder="Describe the image"
                          />
                        </div>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="primary_image"
                            checked={image.is_primary}
                            onChange={() => setPrimaryImage(index)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Set as primary image</span>
                        </label>
                      </div>

                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeImageField(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addImageField}
                  className="btn-secondary w-full flex items-center justify-center"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Add Another Image
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/seller/products')}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct;
