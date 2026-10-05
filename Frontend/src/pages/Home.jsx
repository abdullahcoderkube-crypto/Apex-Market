import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { addProduct, getProducts, getVendorOrders, getVendorInventory, updateVendorProduct, removeOrRestoreVendorProduct, updateVendorOrderStatus, getWishlist, addWishlistItem, removeWishlistItem, getJDPickupAddresses, getJDServiceability, getJDWeights } from '../utils/api';

import './Home.css';

const CATEGORIES = [
  { id: 'd5f748d1-b4a5-4a1c-b314-83a0d88015c1', label: 'Electronics & Gadgets' },
  { id: '691529e7-1861-410b-8dba-6fbaded9ba26', label: 'Fashion & Apparel' },
  { id: 'b6522a3f-20ab-428e-a764-5d47c8d45500', label: 'Home & Kitchen' },
];

const INITIAL_FORM = {
  productName: '',
  categoryId: '',
  productDescription: '',
  productPrice: '',
  productStock: '',
  imageFiles: [],
};

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialQuery);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Vendor orders states
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendorOrdersLoading, setVendorOrdersLoading] = useState(false);
  const [vendorOrdersError, setVendorOrdersError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'inventory'

  // Vendor inventory states
  const [vendorInventory, setVendorInventory] = useState([]);
  const [vendorInventoryLoading, setVendorInventoryLoading] = useState(false);
  const [vendorInventoryError, setVendorInventoryError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    productId: '',
    productName: '',
    categoryId: '',
    productDescription: '',
    productPrice: '',
    productStock: '',
    imageFiles: [],
  });
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [isReplacingImages, setIsReplacingImages] = useState(false);
  const [restoringProductId, setRestoringProductId] = useState(null);
  const [restoringStockValue, setRestoringStockValue] = useState('');
  const [actionLoading, setActionLoading] = useState(null);


  // Customer marketplace states
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Wishlist states
  const [wishlistProductIds, setWishlistProductIds] = useState(new Set());
  const [wishlistItems, setWishlistItems] = useState([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Fetch products function
  const fetchProducts = async (categoryVal, sortVal, pageVal, queryVal = '') => {
    try {
      setProductsLoading(true);
      setProductsError('');
      
      const params = {
        page: pageVal,
        limit: 12,
      };
      if (categoryVal) params.category = categoryVal;
      if (sortVal) params.sortBy = sortVal;
      if (queryVal) params.query = queryVal;

      const response = await getProducts(params);

      if (response) {
        setProducts(response.products || []);
        setTotalPages(response.metadata?.totalPages || 1);
        setCurrentPage(response.metadata?.currentPage || pageVal);
      }
    } catch (err) {
      console.error(err);
      setProductsError(err.message || 'Failed to load products.');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchVendorOrders = async () => {
    try {
      setVendorOrdersLoading(true);
      setVendorOrdersError('');
      const response = await getVendorOrders();
      if (response && response.success) {
        setVendorOrders(response.orders || []);
      } else {
        setVendorOrders([]);
      }
    } catch (err) {
      console.error(err);
      setVendorOrdersError(err.message || 'Failed to load vendor orders.');
    } finally {
      setVendorOrdersLoading(false);
    }
  };

  const fetchVendorInventory = async () => {
    try {
      setVendorInventoryLoading(true);
      setVendorInventoryError('');
      const response = await getVendorInventory();
      if (response && response.success) {
        setVendorInventory(response.inventory || []);
      } else {
        setVendorInventory([]);
      }
    } catch (err) {
      console.error(err);
      setVendorInventoryError(err.message || 'Failed to load inventory.');
    } finally {
      setVendorInventoryLoading(false);
    }
  };

  // ── JD Shipment Modal State ──────────────────────────────────────────────
  const [jdShipModalOpen, setJdShipModalOpen] = useState(false);
  const [jdModalStep, setJdModalStep] = useState(1); // 1 = pickup/weight form | 2 = courier selection
  const [selectedOrderForJd, setSelectedOrderForJd] = useState(null);
  const [jdPickupAddresses, setJdPickupAddresses] = useState([]);
  const [jdPickupLoading, setJdPickupLoading] = useState(false);
  const [jdServiceabilityLoading, setJdServiceabilityLoading] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [jdShipForm, setJdShipForm] = useState({
      pickup_address_id: '',
      weight: '',         // value in grams, selected from JD weights dropdown
  });
  const [jdWeightOptions, setJdWeightOptions] = useState([]);
  const [jdWeightsLoading, setJdWeightsLoading] = useState(false);

  // Shipment success receipt modal
  const [shipmentSuccessOpen, setShipmentSuccessOpen] = useState(false);
  const [shipmentSuccessData, setShipmentSuccessData] = useState(null);

  const handleShipOrderClick = async (order) => {
    setSelectedOrderForJd(order);
    setJdShipForm({ pickup_address_id: '', weight: '' });
    setJdModalStep(1);
    setAvailableCouriers([]);
    setSelectedCourier(null);
    setJdShipModalOpen(true);

    // Fetch pickup addresses and weight options in parallel
    setJdPickupLoading(true);
    setJdWeightsLoading(true);
    try {
      const [addrRes, weightRes] = await Promise.all([
        getJDPickupAddresses(),
        getJDWeights(),
      ]);

      // Pickup addresses
      const addrs = addrRes?.data ?? addrRes ?? [];
      const addrArr = Array.isArray(addrs) ? addrs : [];
      setJdPickupAddresses(addrArr);
      if (addrArr.length > 0) {
        setJdShipForm(prev => ({ ...prev, pickup_address_id: String(addrArr[0].id) }));
      }

      // Weight options — JD returns { id, name: "500G", weight: 0.5 } (weight in KG)
      // Convert to grams for the serviceability API (weight * 1000)
      const rawWeights = weightRes?.data ?? weightRes ?? [];
      const weights = Array.isArray(rawWeights) ? rawWeights.map(w => ({
        id:    w.id,
        label: w.name,              // e.g. "500G", "1KG", "2KG"
        grams: Math.round(w.weight * 1000), // convert KG → grams
      })) : [];
      setJdWeightOptions(weights);
    } catch (err) {
      console.error('Failed to load JD modal data:', err);
      setJdPickupAddresses([]);
      setJdWeightOptions([]);
    } finally {
      setJdPickupLoading(false);
      setJdWeightsLoading(false);
    }
  };

  /** Step 1 submit: check serviceability → move to step 2 */
  const handleCheckServiceability = async (e) => {
    e.preventDefault();
    if (!jdShipForm.pickup_address_id || !jdShipForm.weight) return;

    const order = selectedOrderForJd;
    const destinationPincode = order?.shippingAddress?.postalCode || order?.address?.postalCode;
    if (!destinationPincode) {
      alert('Cannot determine destination pincode from the order address.');
      return;
    }

    // Find the selected pickup address object to get its pincode
    const pickupAddr = jdPickupAddresses.find(a => String(a.id) === String(jdShipForm.pickup_address_id));
    const pickupPincode = pickupAddr?.pincode || pickupAddr?.zip_code || pickupAddr?.postal_code;
    if (!pickupPincode) {
      alert('Could not determine pincode for the selected pickup address. Please check your JD pickup address configuration.');
      return;
    }

    const paymentMode = (order?.paymentMethod === 'Stripe' || order?.payment_method === 'Stripe')
      ? 'Prepaid' : 'COD';

    try {
      setJdServiceabilityLoading(true);
      const { getJDServiceability } = await import('../utils/api');
      const res = await getJDServiceability({
        pickup_pincode: String(pickupPincode),
        destination_pincode: String(destinationPincode),
        weight: Number(jdShipForm.weight),    // in grams as required by JD API
        payment_mode: paymentMode,
        declared_value: parseFloat(order?.vendorSubtotal || order?.netAmount || 1000),
      });

      if (res && res.data && res.data.length > 0) {
        setAvailableCouriers(res.data);
        setSelectedCourier(res.data[0]);
        setJdModalStep(2);
      } else {
        alert('No couriers available for this route. Please try a different pickup address or check pincodes.');
      }
    } catch (err) {
      console.error('Serviceability check failed', err);
      alert(err.message || 'Failed to check courier serviceability.');
    } finally {
      setJdServiceabilityLoading(false);
    }
  };

  /** Step 2 submit: create shipment */
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedCourier) return;
    const orderId = selectedOrderForJd.id;
    try {
      setActionLoading(orderId);
      const { getAccessToken } = await import('../utils/api');
      const token = getAccessToken();
      // Use courier_code from the serviceability response (e.g. "delhivery_surface").
      const courierCode = selectedCourier.courier_code;

      const res = await fetch(`http://localhost:3000/api/vendor/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickup_address_id: jdShipForm.pickup_address_id,
          weight: jdShipForm.weight,
          courier_code: courierCode,
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create shipment');
      }

      if (data && data.success) {
        // 1. Move order to shipped in state, and attach JD details so Processed tab can show them
        setVendorOrders(prev => prev.map(o =>
          o.id === orderId
            ? { ...o, status: 'shipped', jdShipmentId: data.jdShipmentId, jdAwb: data.awb, jdCourier: data.courier, jdLabelUrl: data.label_url }
            : o
        ));

        // 2. Close ship modal
        setJdShipModalOpen(false);

        // 3. Open success receipt modal
        setShipmentSuccessData({
          orderId,
          shipmentId: data.jdShipmentId,
          awb: data.awb,
          courier: data.courier || selectedCourier.courier_name || selectedCourier.display_name,
          labelUrl: data.label_url,
        });
        setShipmentSuccessOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to create shipment');
    } finally {
      setActionLoading(null);
    }
  };





  // Product Edit Modal Handlers
  const handleEditProductClick = (product) => {
    setEditFormData({
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      productDescription: product.description,
      productPrice: product.price.toString(),
      productStock: product.stock.toString(),
      imageFiles: [],
    });
    setEditImagePreviews(product.image_urls || (product.imageUrl ? [product.imageUrl] : []));
    setIsReplacingImages(false);
    setFormError('');
    setFormSuccess('');
    setShowEditModal(true);
    setRestoringProductId(null);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsReplacingImages(true);
    setEditFormData(prev => {
      const existing = prev.imageFiles || [];
      const newFiles = [...existing, ...files].slice(0, 5);
      const previews = newFiles.map(f => URL.createObjectURL(f));
      setEditImagePreviews(previews);
      return { ...prev, imageFiles: newFiles };
    });
    if (formError) setFormError('');
  };

  const handleRemoveEditImage = (index) => {
    // Ensure we are in replace mode when removing any image
    setIsReplacingImages(true);
    // Update previews
    setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
    // Update the corresponding File objects if this preview was from a newly added file
    setEditFormData(prev => {
      const newFiles = prev.imageFiles.filter((_, i) => i !== index);
      return { ...prev, imageFiles: newFiles };
    });
  };

  const validateEditForm = () => {
    const { productName, categoryId, productDescription, productPrice, productStock, imageFiles } = editFormData;
    if (!productName.trim()) return 'Product name is required.';
    if (!categoryId) return 'Please select a category.';
    if (!productDescription.trim()) return 'Product description is required.';
    if (!productPrice || isNaN(productPrice) || Number(productPrice) <= 0) return 'Please enter a valid price.';
    if (!productStock || isNaN(productStock) || !Number.isInteger(Number(productStock)) || Number(productStock) < 0)
      return 'Please enter a valid stock quantity (whole number).';
    if (imageFiles && imageFiles.length > 0) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      for (const file of imageFiles) {
        if (!allowed.includes(file.type)) return 'Each image must be JPEG, PNG, or WebP.';
        if (file.size > 5 * 1024 * 1024) return 'Each image must be smaller than 5 MB.';
      }
    }
    return null;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const error = validateEditForm();
    if (error) { setFormError(error); return; }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const data = new FormData();
      data.append('productId', editFormData.productId);
      data.append('name', editFormData.productName.trim());
      data.append('categoryId', editFormData.categoryId);
      data.append('description', editFormData.productDescription.trim());
      data.append('price', editFormData.productPrice);
      data.append('stock', editFormData.productStock);
      data.append('isReplacingImages', isReplacingImages);
      if (isReplacingImages && editFormData.imageFiles && editFormData.imageFiles.length > 0) {
        editFormData.imageFiles.forEach(file => {
          data.append('imageFiles', file);
        });
      }

      const res = await updateVendorProduct(data);
      if (res && res.success) {
        setFormSuccess('🎉 Product updated successfully!');
        setVendorInventory(prev => prev.map(p => p.id === editFormData.productId ? res.product : p));
        setTimeout(() => {
          setShowEditModal(false);
          setFormSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to update product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Product Handler
  const handleRemoveProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to remove this product?")) {
      return;
    }
    try {
      setActionLoading(productId);
      const res = await removeOrRestoreVendorProduct(productId, false);
      if (res && res.success) {
        setVendorInventory(prev => prev.map(p => p.id === productId ? { ...p, isActive: false } : p));
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to remove product");
    } finally {
      setActionLoading(null);
    }
  };

  // Restore Product Handlers
  const handleRestoreClick = (product) => {
    setRestoringProductId(product.id);
    setRestoringStockValue('10'); // default initial stock
    setShowEditModal(false);
  };

  const handleRestoreSubmit = async (e, productId) => {
    e.preventDefault();
    if (!restoringStockValue.trim() || isNaN(restoringStockValue) || Number(restoringStockValue) < 0 || !Number.isInteger(Number(restoringStockValue))) {
      alert("Please enter a valid non-negative integer for stock.");
      return;
    }

    try {
      setActionLoading(productId);
      const res = await removeOrRestoreVendorProduct(productId, true, parseInt(restoringStockValue, 10));
      if (res && res.success) {
        setVendorInventory(prev => prev.map(p => p.id === productId ? { ...p, isActive: true, stock: res.product.stock } : p));
        setRestoringProductId(null);
        setRestoringStockValue('');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to restore product");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (user && user.role === 'vendor') {
      fetchVendorInventory(); // Load inventory on mount for metrics/list
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'vendor') {
      if (activeTab === 'orders') {
        fetchVendorOrders();
      } else if (activeTab === 'inventory') {
        fetchVendorInventory();
      }
    }
  }, [user, activeTab]);


  const fetchWishlist = async () => {
    try {
      setWishlistLoading(true);
      const res = await getWishlist();
      const items = res?.wishlist || [];
      setWishlistItems(items);
      setWishlistProductIds(new Set(items.map(item => item.id)));
    } catch (err) {
      console.error("Failed to load wishlist:", err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleWishlistToggle = async (e, productId) => {
    e.stopPropagation();
    e.preventDefault();
    
    const isWishlisted = wishlistProductIds.has(productId);
    try {
      if (isWishlisted) {
        await removeWishlistItem(productId);
        setWishlistProductIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        setWishlistItems(prev => prev.filter(item => item.id !== productId));
      } else {
        await addWishlistItem(productId);
        setWishlistProductIds(prev => {
          const next = new Set(prev);
          next.add(productId);
          return next;
        });
        const product = products.find(p => p.id === productId);
        if (product) {
          setWishlistItems(prev => [...prev, product]);
        } else {
          fetchWishlist();
        }
      }
    } catch (err) {
      console.error("Failed to toggle wishlist item:", err);
      alert(err.message || "Something went wrong.");
    }
  };

  const handleAddToWishlistCart = (product) => {
    if (product.stock <= 0) {
      alert("This product is out of stock.");
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const prodId = product.id;
    const existingIndex = cart.findIndex(item => (item.id || item.productId) === prodId);

    if (existingIndex > -1) {
      if (cart[existingIndex].quantity < product.stock) {
        cart[existingIndex].quantity += 1;
      } else {
        alert(`Only ${product.stock} items available in stock.`);
        return;
      }
    } else {
      cart.push({ ...product, id: prodId, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`🎉 ${product.name} added to cart!`);
  };

  const handleWishlistBuyNow = (product) => {
    if (product.stock <= 0) {
      alert("This product is out of stock.");
      return;
    }
    navigate('/checkout', { state: { product: { ...product, id: product.id, quantity: 1 } } });
  };

  useEffect(() => {
    if (user && user.role === 'customer') {
      const q = searchParams.get('query') || '';
      setSearchQuery(q);
      setActiveSearchQuery(q);
      fetchProducts(selectedCategory, sortBy, currentPage, q);
      fetchWishlist();
    }
  }, [user, user?.role, selectedCategory, sortBy, currentPage, searchParams]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchProducts(selectedCategory, sortBy, newPage, activeSearchQuery);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    const q = searchQuery.trim();
    if (q) {
      setSearchParams({ query: q });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setSearchParams({});
  };

  if (!user) {
    return (
      <div className="center-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const isVendor = user.role === 'vendor';
  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setFormData(prev => {
      const existing = prev.imageFiles || [];
      const newFiles = [...existing, ...files].slice(0, 5);
      const previews = newFiles.map(f => URL.createObjectURL(f));
      setImagePreviews(previews);
      return { ...prev, imageFiles: newFiles };
    });
    if (formError) setFormError('');
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => {
      const newFiles = prev.imageFiles.filter((_, i) => i !== index);
      const previews = newFiles.map(f => URL.createObjectURL(f));
      setImagePreviews(previews);
      return { ...prev, imageFiles: newFiles };
    });
  };

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM);
    setImagePreviews([]);
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
  };

  const validateForm = () => {
    const { productName, categoryId, productDescription, productPrice, productStock, imageFiles } = formData;
    if (!productName.trim()) return 'Product name is required.';
    if (!categoryId) return 'Please select a category.';
    if (!productDescription.trim()) return 'Product description is required.';
    if (!productPrice || isNaN(productPrice) || Number(productPrice) <= 0) return 'Please enter a valid price.';
    if (!productStock || isNaN(productStock) || !Number.isInteger(Number(productStock)) || Number(productStock) < 0)
      return 'Please enter a valid stock quantity (whole number).';
    if (!imageFiles || imageFiles.length === 0) return 'Please upload at least one product image.';
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of imageFiles) {
      if (!allowed.includes(file.type)) return 'Each image must be JPEG, PNG, or WebP.';
      if (file.size > 5 * 1024 * 1024) return 'Each image must be smaller than 5 MB.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) { setFormError(error); return; }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const data = new FormData();
      data.append('productName', formData.productName.trim());
      data.append('categoryId', formData.categoryId);
      data.append('productDescription', formData.productDescription.trim());
      data.append('productPrice', formData.productPrice);
      data.append('productStock', formData.productStock);
      formData.imageFiles.forEach(file => {
        data.append('imageFiles', file);
      });

      await addProduct(data);

      setFormSuccess('🎉 Product listed successfully!');
      setFormData(INITIAL_FORM);
      setImagePreviews([]);
      
      // Refresh vendor inventory
      fetchVendorInventory();

      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1800);
    } catch (err) {
      setFormError(err.message || 'Failed to add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for dashboard metrics
  const processedOrders = vendorOrders.filter(o => o.status === 'shipped');
  const totalRevenue = processedOrders.reduce((acc, o) => acc + (o.vendorSubtotal || 0), 0);
  const productsSold = processedOrders.reduce((acc, o) => {
    return acc + (o.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, 0);

  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="brand">ApexMarket</div>
        <div className="user-nav-info">
          <div className="user-tag">
            <div className="user-avatar">{userInitials}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
              <span className={`role-badge ${isVendor ? 'vendor' : 'customer'}`}>
                {user.role}
              </span>
            </div>
          </div>
          {user.roles && user.roles.length > 1 && (
            <button
              onClick={() => navigate('/role-selection')}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Switch Role
            </button>
          )}
          {!isVendor && (
            <>
              <button
                onClick={() => {
                  fetchWishlist();
                  setShowWishlistModal(true);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginLeft: '0.5rem' }}
              >
                ❤️ My Wishlist
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginLeft: '0.5rem' }}
              >
                📦 My Orders
              </button>
              <button
                onClick={() => navigate('/checkout')}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginRight: '0.5rem', marginLeft: '0.5rem' }}
              >
                🛒 My Cart
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginRight: '0.5rem' }}
            title="Profile & Settings"
          >
            ⚙️ Settings
          </button>
          {/* Theme toggle */}
          <button
            className={`theme-toggle${theme === 'dark' ? ' theme-toggle--dark' : ''}`}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="theme-toggle__icon-sun">☀️</span>
            <span className="theme-toggle__icon-moon">🌙</span>
            <span className="theme-toggle__thumb" />
          </button>
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Dashboard Area */}
      <main className="dashboard-content">
        <div className="welcome-banner">
          <h1 className="welcome-title">Hello, {user.name}!</h1>
          <p className="welcome-subtitle">
            Welcome back to ApexMarket. Here is an overview of your activity.
          </p>
        </div>

        {isVendor ? (
          /* ── Vendor Dashboard ──────────────────────────────────────── */
          <>
            {/* Vendor Navigation Tabs */}
            <div className="vendor-tabs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className={`vendor-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📊 Overview
              </button>
              <button 
                className={`vendor-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
                id="vendor-inventory-tab"
              >
                📦 Inventory
              </button>
              <button 
                className={`vendor-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
                id="vendor-orders-tab"
              >
                📋 Orders to Process
              </button>
              <button 
                className={`vendor-tab-btn ${activeTab === 'orders_processed' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders_processed')}
                id="vendor-orders-processed-tab"
              >
                ✅ Orders Processed
              </button>
            </div>

            {activeTab === 'overview' ? (
              <>
                <div className="metrics-grid">
                  <div className="dashboard-card glass-panel" onClick={() => setActiveTab('orders_processed')}>
                    <div className="card-icon">💰</div>
                    <div className="card-title">Total Revenue</div>
                    <div className="card-value">${totalRevenue.toFixed(2)}</div>
                    <div className="card-trend neutral">● Processed earnings</div>
                  </div>
                  <div className="dashboard-card glass-panel" onClick={() => setActiveTab('orders_processed')}>
                    <div className="card-icon">📦</div>
                    <div className="card-title">Products Sold</div>
                    <div className="card-value">{productsSold}</div>
                    <div className="card-trend neutral">● Dynamic count</div>
                  </div>
                  <div className="dashboard-card glass-panel" onClick={() => setActiveTab('inventory')} id="vendor-listings-card">
                    <div className="card-icon">🏷️</div>
                    <div className="card-title">Active Listings</div>
                    <div className="card-value">{vendorInventory.filter(p => p.isActive).length}</div>
                    <div className="card-trend neutral">● Manage products</div>
                  </div>
                </div>

                <div className="showcase-section">
                  <h3>Vendor Admin Panel</h3>
                  <p className="showcase-text">
                    Start listing new products, manage inventory, and get the orders directly synced to your <strong><u>JDWebnShip Retailer Panel</u></strong>.
                  </p>
                  <div className="action-bar">
                    <button className="btn btn-primary" onClick={handleOpenModal} id="add-product-btn">
                      + Add New Product
                    </button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('inventory')} id="view-inventory-btn">View Inventory</button>
                  </div>
                </div>
              </>
            ) : activeTab === 'inventory' ? (
              /* ── Vendor Inventory Tab ─────────────────────────────────── */
              <div className="vendor-inventory-section">
                <div className="section-header-row">
                  <h2>Product Inventory</h2>
                  <div className="action-buttons-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {vendorInventory.filter(p => p.isActive && p.stock <= 5).length > 0 && (
                      <button 
                        onClick={() => setShowLowStockModal(true)}
                        className="low-stock-bell-btn blinking-red"
                        title={`${vendorInventory.filter(p => p.isActive && p.stock <= 5).length} items are low on stock!`}
                        type="button"
                      >
                        🔔 <span className="bell-badge">{vendorInventory.filter(p => p.isActive && p.stock <= 5).length}</span>
                      </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={handleOpenModal} id="add-product-btn-inv">
                      + Add New Product
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={fetchVendorInventory} disabled={vendorInventoryLoading} style={{ marginLeft: '0.5rem' }}>
                      {vendorInventoryLoading ? 'Refreshing...' : '🔄 Refresh Inventory'}
                    </button>
                  </div>
                </div>

                {vendorInventoryError && (
                  <div className="alert alert-error" role="alert">
                    {vendorInventoryError}
                  </div>
                )}

                {vendorInventoryLoading ? (
                  <div className="products-loading-wrapper" style={{ minHeight: '200px', position: 'relative' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading inventory...</p>
                  </div>
                ) : vendorInventory.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
                    <h3>No products listed yet</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Click "+ Add New Product" to list your first item.</p>
                  </div>
                ) : (
                  <div className="vendor-inventory-grid">
                    {vendorInventory.map((product) => {
                      const categoryObj = CATEGORIES.find(c => c.id === product.categoryId);
                      const categoryLabel = categoryObj ? categoryObj.label : 'Product';
                      const displayImage = (product.image_urls && product.image_urls.length > 0) ? product.image_urls[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80');
                      
                      const isRestoring = restoringProductId === product.id;
                      const isLoading = actionLoading === product.id;

                      return (
                        <div key={product.id} className={`vendor-product-card glass-panel ${!product.isActive ? 'product-removed' : ''}`}>
                          <div className="vendor-product-image-wrapper">
                            <img src={displayImage} alt={product.name} className="vendor-product-image" />
                            {!product.isActive && (
                              <div className="removed-overlay">
                                <span>Removed</span>
                              </div>
                            )}
                          </div>

                          <div className="vendor-product-info">
                            <div className="badge-row">
                              <span className={`category-badge cat-${product.categoryId}`}>
                                {categoryLabel}
                              </span>
                              <span className={`status-badge ${product.isActive ? (product.stock > 0 ? 'status-paid' : 'status-unpaid') : 'status-cancelled'}`}>
                                {product.isActive ? (product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock') : 'Removed'}
                              </span>
                            </div>

                            <h4 className="vendor-product-name">{product.name}</h4>
                            <p className="vendor-product-desc">{product.description}</p>
                            
                            <div className="price-stock-row">
                              <span className="vendor-product-price">${parseFloat(product.price).toFixed(2)}</span>
                              <span className="vendor-product-stock-display">
                                Current Stock: <strong>{product.stock}</strong>
                              </span>
                            </div>

                            {/* Action Forms or Buttons */}
                            <div className="vendor-product-actions">
                              {isRestoring ? (
                                <form onSubmit={(e) => handleRestoreSubmit(e, product.id)} className="inline-action-form">
                                  <div className="input-group-inline">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      className="form-input form-input-sm"
                                      value={restoringStockValue}
                                      onChange={(e) => setRestoringStockValue(e.target.value)}
                                      disabled={isLoading}
                                      placeholder="Restore stock"
                                      autoFocus
                                      required
                                    />
                                    <button type="submit" className="btn btn-primary btn-xs" disabled={isLoading} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                      {isLoading ? '...' : 'Restore'}
                                    </button>
                                    <button type="button" className="btn btn-secondary btn-xs" onClick={() => setRestoringProductId(null)} disabled={isLoading}>
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="buttons-row">
                                  {product.isActive ? (
                                    <>
                                      <button 
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => handleEditProductClick(product)}
                                        disabled={isLoading}
                                      >
                                        Update Product
                                      </button>
                                      <button 
                                        className="btn btn-danger btn-sm" 
                                        onClick={() => handleRemoveProduct(product.id)}
                                        disabled={isLoading}
                                      >
                                        Remove Product
                                      </button>
                                    </>
                                  ) : (
                                    <button 
                                      className="btn btn-restore btn-sm" 
                                      onClick={() => handleRestoreClick(product)}
                                      disabled={isLoading}
                                    >
                                      Restore Product
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'orders' ? (

              /* ── Vendor Orders Tab ────────────────────────────────────── */
              <div className="vendor-orders-section">
                <div className="section-header-row">
                  <h2>Orders to Process</h2>
                  <button className="btn btn-secondary btn-sm" onClick={fetchVendorOrders} disabled={vendorOrdersLoading}>
                    {vendorOrdersLoading ? 'Refreshing...' : '🔄 Refresh Orders'}
                  </button>
                </div>

                {vendorOrdersError && (
                  <div className="alert alert-error" role="alert">
                    {vendorOrdersError}
                  </div>
                )}

                {vendorOrdersLoading ? (
                  <div className="products-loading-wrapper" style={{ minHeight: '200px', position: 'relative' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading orders...</p>
                  </div>
                ) : vendorOrders.filter(o => o.status !== 'shipped').length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                    <h3>No orders to process</h3>
                    <p style={{ color: 'var(--text-muted)' }}>When customers buy your products, they will show up here.</p>
                  </div>
                ) : (
                  <div className="vendor-orders-list">
                    {vendorOrders.filter(o => o.status !== 'shipped').map((order) => {
                      const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={order.id} className="order-panel glass-panel">
                          {/* Order Summary Header */}
                          <div className="order-header-main">
                            <div className="order-meta-info">
                              <span className="order-id-badge">Order ID: {order.id.slice(0, 8)}...</span>
                              <span className="order-date-label">{orderDate}</span>
                            </div>
                            <div className="order-status-badge-container">
                              <span className={`status-badge status-${order.status}`}>
                                {order.status}
                              </span>
                              <span className="payment-method-badge">
                                {order.paymentMethod}
                              </span>
                            </div>
                          </div>

                          <div className="order-body-grid">
                            {/* Customer and Shipping details */}
                            <div className="customer-details-card">
                              <h5>Customer Details</h5>
                              <p className="cust-info">
                                <strong>Name:</strong> {order.customerName}<br />
                                <strong>Email:</strong> {order.customerEmail}
                              </p>

                              {order.shippingAddress && (
                                <div className="shipping-address-box">
                                  <h5>Shipping Address</h5>
                                  <p className="address-text">
                                    <strong>{order.shippingAddress.fullName}</strong><br />
                                    {order.shippingAddress.phone && <>Phone: {order.shippingAddress.phone}<br /></>}
                                    {order.shippingAddress.addressLine1}<br />
                                    {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
                                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}<br />
                                    {order.shippingAddress.country}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Items details */}
                            <div className="items-list-card">
                              <h5>Items to Fulfill ({order.items.length})</h5>
                              <div className="order-items-grid">
                                {order.items.map((item) => (
                                  <div key={item.id} className="vendor-item-row">
                                    {item.imageUrl && (
                                      <img src={item.imageUrl} alt={item.name} className="item-thumbnail" />
                                    )}
                                    <div className="item-details">
                                      <span className="item-name">{item.name}</span>
                                      <span className="item-qty-price">
                                        Qty: <strong>{item.quantity}</strong> × ${item.price.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="item-row-total">
                                      ${item.total.toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="vendor-order-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <div>
                                  <span className="vendor-subtotal-label">Your Earnings: </span>
                                  <span className="vendor-subtotal-value">${order.vendorSubtotal.toFixed(2)}</span>
                                </div>
                                {order.status === 'paid' && order.paymentMethod === 'Stripe' && (
                                  <button
                                    onClick={() => handleShipOrderClick(order)}
                                    className="btn btn-primary btn-sm"
                                    disabled={actionLoading === order.id}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                  >
                                    Ship Order
                                  </button>
                                )}
                                {order.status === 'unpaid' && order.paymentMethod === 'COD' && (
                                  <button
                                    onClick={() => handleShipOrderClick(order)}
                                    className="btn btn-primary btn-sm"
                                    disabled={actionLoading === order.id}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                  >
                                    Ship Order
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ── Vendor Orders Processed Tab ──────────────────────────── */
              <div className="vendor-orders-section">
                <div className="section-header-row">
                  <h2>Orders Processed</h2>
                  <button className="btn btn-secondary btn-sm" onClick={fetchVendorOrders} disabled={vendorOrdersLoading}>
                    {vendorOrdersLoading ? 'Refreshing...' : '🔄 Refresh Orders'}
                  </button>
                </div>

                {vendorOrdersError && (
                  <div className="alert alert-error" role="alert">
                    {vendorOrdersError}
                  </div>
                )}

                {vendorOrdersLoading ? (
                  <div className="products-loading-wrapper" style={{ minHeight: '200px', position: 'relative' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading orders...</p>
                  </div>
                ) : vendorOrders.filter(o => o.status === 'shipped').length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                    <h3>No processed orders</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Orders that have been shipped will show up here.</p>
                  </div>
                ) : (
                  <div className="vendor-orders-list">
                    {vendorOrders.filter(o => o.status === 'shipped').map((order) => {
                      const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={order.id} className="order-panel glass-panel">
                          {/* Order Summary Header */}
                          <div className="order-header-main">
                            <div className="order-meta-info">
                              <span className="order-id-badge">Order ID: {order.id.slice(0, 8)}...</span>
                              <span className="order-date-label">{orderDate}</span>
                            </div>
                            <div className="order-status-badge-container">
                              <span className={`status-badge status-${order.status}`}>
                                {order.status}
                              </span>
                              <span className="payment-method-badge">
                                {order.paymentMethod}
                              </span>
                            </div>
                          </div>

                          {/* ── JD Shipment Details ── */}
                          {(order.jdAwb || order.jdShipmentId) && (
                            <div style={{
                              margin: '0.75rem 0',
                              padding: '0.75rem 1rem',
                              borderRadius: '10px',
                              background: 'rgba(99,102,241,0.08)',
                              border: '1px solid rgba(99,102,241,0.2)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '1rem',
                              alignItems: 'center',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>🚚</span>
                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                  {order.jdCourier || 'JD WebnShip'}
                                </span>
                              </div>
                              {order.jdAwb && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AWB:</span>
                                  <code style={{ fontWeight: 700, letterSpacing: '0.05em', fontSize: '0.9rem' }}>{order.jdAwb}</code>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => navigator.clipboard.writeText(order.jdAwb)}
                                    title="Copy AWB"
                                  >📋 Copy</button>
                                </div>
                              )}
                              {order.jdShipmentId && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  Shipment ID: <strong>{order.jdShipmentId}</strong>
                                </div>
                              )}
                              {order.jdLabelUrl && (
                                <a
                                  href={order.jdLabelUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}
                                >
                                  🏷️ Label
                                </a>
                              )}
                            </div>
                          )}

                          <div className="order-body-grid">
                            {/* Customer and Shipping details */}
                            <div className="customer-details-card">
                              <h5>Customer Details</h5>
                              <p className="cust-info">
                                <strong>Name:</strong> {order.customerName}<br />
                                <strong>Email:</strong> {order.customerEmail}
                              </p>

                              {order.shippingAddress && (
                                <div className="shipping-address-box">
                                  <h5>Shipping Address</h5>
                                  <p className="address-text">
                                    <strong>{order.shippingAddress.fullName}</strong><br />
                                    {order.shippingAddress.phone && <>Phone: {order.shippingAddress.phone}<br /></>}
                                    {order.shippingAddress.addressLine1}<br />
                                    {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
                                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}<br />
                                    {order.shippingAddress.country}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Items details */}
                            <div className="items-list-card">
                              <h5>Items ({order.items.length})</h5>
                              <div className="order-items-grid">
                                {order.items.map((item) => (
                                  <div key={item.id} className="vendor-item-row">
                                    {item.imageUrl && (
                                      <img src={item.imageUrl} alt={item.name} className="item-thumbnail" />
                                    )}
                                    <div className="item-details">
                                      <span className="item-name">{item.name}</span>
                                      <span className="item-qty-price">
                                        Qty: <strong>{item.quantity}</strong> × ${item.price.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="item-row-total">
                                      ${item.total.toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="vendor-order-footer">
                                <span className="vendor-subtotal-label">Your Earnings:</span>
                                <span className="vendor-subtotal-value">${order.vendorSubtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </>
        ) : (
          /* ── Customer Dashboard ─────────────────────────────────────── */
          <>
            {/* Search Bar */}
            <div className="search-bar-wrapper glass-panel">
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-container">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search for products, categories, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {activeSearchQuery && (
                    <button type="button" className="clear-search-btn" onClick={handleClearSearch} aria-label="Clear search">
                      ✕
                    </button>
                  )}
                </div>
                <button type="submit" className="btn btn-primary search-submit-btn">
                  Search
                </button>
              </form>
            </div>

            {/* Controls Bar: Category dropdown and price filters */}
            <div className="marketplace-controls-wrapper">
              <div className="form-group category-dropdown-group">
                <label className="form-label" htmlFor="marketplaceCategory">Category</label>
                <select
                  id="marketplaceCategory"
                  name="marketplaceCategory"
                  className="form-input form-select category-select"
                  value={selectedCategory}
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    setSelectedCategory(categoryId);
                    setCurrentPage(1);
                    fetchProducts(categoryId, sortBy, 1, activeSearchQuery);
                  }}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-buttons-group">
                <span className="filter-label">Sort by Price</span>
                <div className="sort-buttons">
                  <button
                    onClick={() => {
                      const newSort = sortBy === 'price_asc' ? '' : 'price_asc';
                      setSortBy(newSort);
                      setCurrentPage(1);
                      fetchProducts(selectedCategory, newSort, 1, activeSearchQuery);
                    }}
                    className={`btn btn-secondary sort-btn ${sortBy === 'price_asc' ? 'active' : ''}`}
                    title="Sort lowest to highest"
                  >
                    Lowest Price
                  </button>
                  <button
                    onClick={() => {
                      const newSort = sortBy === 'price_desc' ? '' : 'price_desc';
                      setSortBy(newSort);
                      setCurrentPage(1);
                      fetchProducts(selectedCategory, newSort, 1, activeSearchQuery);
                    }}
                    className={`btn btn-secondary sort-btn ${sortBy === 'price_desc' ? 'active' : ''}`}
                    title="Sort highest to lowest"
                  >
                    Highest Price
                  </button>
                </div>
              </div>
            </div>

            {/* Error state */}
            {productsError && (
              <div className="alert alert-error" role="alert" style={{ marginTop: '1rem' }}>
                {productsError}
              </div>
            )}

            {/* Product Grid */}
            <div className="marketplace-products-section">
              {productsLoading ? (
                <div className="products-loading-wrapper">
                  <div className="spinner"></div>
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="empty-state glass-panel">
                  <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                  <h3>No products found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Try changing your category filter or check back later.</p>
                </div>
              ) : (
                <div className="products-grid">
                  {products.map((product) => {
                    const categoryObj = CATEGORIES.find(c => c.id === product.categoryId);
                    const categoryLabel = categoryObj ? categoryObj.label : 'Product';
                    const displayImage = (product.image_urls && product.image_urls.length > 0) ? product.image_urls[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80');
                    const isWish = wishlistProductIds.has(product.id);
                    return (
                      <div
                        key={product.id}
                        className="product-card glass-panel"
                        onClick={() => navigate(`/product/${product.id}`)}
                        style={{ position: 'relative' }}
                      >
                        <button
                          className={`wishlist-heart-btn ${isWish ? 'active' : ''}`}
                          onClick={(e) => handleWishlistToggle(e, product.id)}
                          aria-label={isWish ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          {isWish ? '❤️' : '🤍'}
                        </button>
                        <div className="product-card-image-wrapper">
                          <img
                            src={displayImage}
                            alt={product.name}
                            className="product-card-image"
                          />
                        </div>
                        <div className="product-card-info">
                          <span className={`category-badge cat-${product.categoryId}`}>
                            {categoryLabel}
                          </span>
                          <h4 className="product-card-title">{product.name}</h4>
                          <div className="product-card-price">
                            ${parseFloat(product.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || productsLoading}
                  className="btn btn-secondary pagination-btn"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || productsLoading}
                  className="btn btn-secondary pagination-btn"
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Add Product Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="modal-title">List a New Product</h2>
                <p className="modal-subtitle">Fill in the details to add your product to the marketplace.</p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close modal" disabled={submitting}>
                ✕
              </button>
            </div>

            {/* Alerts */}
            {formError && <div className="alert alert-error" role="alert">{formError}</div>}
            {formSuccess && <div className="alert alert-success" role="status">{formSuccess}</div>}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="product-form">
              {/* Row 1: Name + Category */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="productName">Product Name</label>
                  <input
                    id="productName"
                    name="productName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                    value={formData.productName}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="categoryId">Category</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="form-input form-select"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  >
                    <option value="">— Select a category —</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="productDescription">Description</label>
                <textarea
                  id="productDescription"
                  name="productDescription"
                  className="form-input form-textarea"
                  placeholder="Describe your product: key features, materials, dimensions…"
                  value={formData.productDescription}
                  onChange={handleInputChange}
                  disabled={submitting}
                  rows={4}
                  required
                />
              </div>

              {/* Row 2: Price + Stock */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="productPrice">Price (USD $)</label>
                  <input
                    id="productPrice"
                    name="productPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.productPrice}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="productStock">Stock Quantity</label>
                  <input
                    id="productStock"
                    name="productStock"
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="0"
                    value={formData.productStock}
                    onChange={handleInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label">Product Images (Upload up to 5)</label>
                
                {imagePreviews.length > 0 && (
                  <div className="multi-image-preview-grid">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="preview-image-container">
                        <img src={src} alt={`Preview ${index + 1}`} className="preview-image-item" />
                        <button
                          type="button"
                          className="btn-remove-preview"
                          onClick={() => handleRemoveImage(index)}
                          title="Remove image"
                          disabled={submitting}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {imagePreviews.length < 5 && (
                  <label htmlFor="imageFile" className={`image-upload-zone ${submitting ? 'disabled' : ''}`}>
                    <div className="image-upload-placeholder">
                      <span className="upload-icon">📸</span>
                      <span className="upload-label">Click to select image(s)</span>
                      <span className="upload-hint">Upload up to {5 - imagePreviews.length} more (JPEG, PNG, WebP — max 5 MB each)</span>
                    </div>
                    <input
                      id="imageFile"
                      name="imageFiles"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      disabled={submitting}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} id="submit-product-btn">
                  {submitting ? <span className="spinner" /> : 'List Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Product Modal ─────────────────────────────────────────────── */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowEditModal(false)} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="edit-modal-title">Edit Product Details</h2>
                <p className="modal-subtitle">Modify the fields below to update your listed product.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)} aria-label="Close modal" disabled={submitting}>
                ✕
              </button>
            </div>

            {/* Alerts */}
            {formError && <div className="alert alert-error" role="alert">{formError}</div>}
            {formSuccess && <div className="alert alert-success" role="status">{formSuccess}</div>}

            {/* Form */}
            <form onSubmit={handleEditSubmit} noValidate className="product-form">
              {/* Row 1: Name + Category */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="editProductName">Product Name</label>
                  <input
                    id="editProductName"
                    name="productName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                    value={editFormData.productName}
                    onChange={handleEditInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editCategoryId">Category</label>
                  <select
                    id="editCategoryId"
                    name="categoryId"
                    className="form-input form-select"
                    value={editFormData.categoryId}
                    onChange={handleEditInputChange}
                    disabled={submitting}
                    required
                  >
                    <option value="">— Select a category —</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="editProductDescription">Description</label>
                <textarea
                  id="editProductDescription"
                  name="productDescription"
                  className="form-input form-textarea"
                  placeholder="Describe your product..."
                  value={editFormData.productDescription}
                  onChange={handleEditInputChange}
                  disabled={submitting}
                  rows={4}
                  required
                />
              </div>

              {/* Row 2: Price + Stock */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="editProductPrice">Price (USD $)</label>
                  <input
                    id="editProductPrice"
                    name="productPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={editFormData.productPrice}
                    onChange={handleEditInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="editProductStock">Stock Quantity</label>
                  <input
                    id="editProductStock"
                    name="productStock"
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="0"
                    value={editFormData.productStock}
                    onChange={handleEditInputChange}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label">Product Images (Upload up to 5)</label>
                
                {editImagePreviews.length > 0 && (
                  <div className="multi-image-preview-grid">
                    {editImagePreviews.map((src, index) => (
                      <div key={index} className="preview-image-container">
                        <img src={src} alt={`Preview ${index + 1}`} className="preview-image-item" />
                        <button
                          type="button"
                          className="btn-remove-preview"
                          onClick={() => handleRemoveEditImage(index)}
                          title="Remove image"
                          disabled={submitting}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {(!isReplacingImages && editImagePreviews.length > 0) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginBottom: '1rem', width: '100%' }}
                    onClick={() => {
                      setIsReplacingImages(true);
                      setEditImagePreviews([]);
                      setEditFormData(prev => ({ ...prev, imageFiles: [] }));
                    }}
                    disabled={submitting}
                  >
                    🔄 Replace Existing Images
                  </button>
                )}

                {(isReplacingImages || editImagePreviews.length === 0) && editImagePreviews.length < 5 && (
                  <label htmlFor="editImageFile" className={`image-upload-zone ${submitting ? 'disabled' : ''}`}>
                    <div className="image-upload-placeholder">
                      <span className="upload-icon">📸</span>
                      <span className="upload-label">Click to select new image(s)</span>
                      <span className="upload-hint">Upload up to {5 - editImagePreviews.length} more (JPEG, PNG, WebP — max 5 MB each)</span>
                    </div>
                    <input
                      id="editImageFile"
                      name="imageFiles"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleEditImageChange}
                      disabled={submitting}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} id="save-product-btn">
                  {submitting ? <span className="spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Wishlist Modal ─────────────────────────────────────────────── */}
      {showWishlistModal && (
        <div className="modal-overlay" onClick={() => setShowWishlistModal(false)} role="dialog" aria-modal="true" aria-labelledby="wishlist-modal-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="wishlist-modal-title">My Wishlist</h2>
                <p className="modal-subtitle">Items you've saved for later</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowWishlistModal(false)} aria-label="Close modal">
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {wishlistLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading wishlist items...</p>
              </div>
            ) : wishlistItems.length === 0 ? (
              <div className="empty-wishlist">
                <span className="empty-wishlist-icon">❤️</span>
                <p className="empty-wishlist-text">Your wishlist is empty</p>
                <p style={{ fontSize: '0.9rem' }}>Browse products and click the heart icon to add items here.</p>
              </div>
            ) : (
              <div className="wishlist-items-list">
                {wishlistItems.map((product) => {
                  const displayImage = (product.image_urls && product.image_urls.length > 0) ? product.image_urls[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80');
                  return (
                    <div key={product.id} className="wishlist-item-card">
                      <img src={displayImage} alt={product.name} className="wishlist-item-image" />
                      <div className="wishlist-item-details">
                        <h4 className="wishlist-item-name">{product.name}</h4>
                        <span className="wishlist-item-price">${parseFloat(product.price).toFixed(2)}</span>
                        <span style={{ fontSize: '0.8rem', color: product.stock > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                          {product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
                        </span>
                      </div>
                      <div className="wishlist-item-actions">
                        <button
                          onClick={() => handleAddToWishlistCart(product)}
                          className="btn btn-secondary btn-sm"
                          disabled={product.stock <= 0}
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={() => handleWishlistBuyNow(product)}
                          className="btn btn-primary btn-sm"
                          disabled={product.stock <= 0}
                        >
                          Buy Now
                        </button>
                        <button
                          onClick={(e) => handleWishlistToggle(e, product.id)}
                          className="btn-remove-preview"
                          style={{ position: 'relative', top: 'auto', right: 'auto', width: '28px', height: '28px', fontSize: '0.85rem', flexShrink: 0 }}
                          title="Remove from wishlist"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Footer */}
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowWishlistModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Low Stock Alert Modal ─────────────────────────────────────────────── */}
      {showLowStockModal && (
        <div className="modal-overlay" onClick={() => setShowLowStockModal(false)} role="dialog" aria-modal="true" aria-labelledby="low-stock-modal-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="low-stock-modal-title" style={{ color: '#ef4444' }}><span style={{ WebkitTextFillColor: 'initial' }}>⚠️</span> Low Stock Alert</h2>
                <p className="modal-subtitle">The following products have stock quantity ≤ 5</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowLowStockModal(false)} aria-label="Close modal">
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="wishlist-items-list" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {vendorInventory.filter(p => p.isActive && p.stock <= 5).map((product) => {
                const displayImage = (product.image_urls && product.image_urls.length > 0) ? product.image_urls[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80');
                return (
                  <div key={product.id} className="wishlist-item-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.03)' }}>
                    <img src={displayImage} alt={product.name} className="wishlist-item-image" style={{ width: '50px', height: '50px' }} />
                    <div className="wishlist-item-details" style={{ flexGrow: 1, textAlign: 'left' }}>
                      <h4 className="wishlist-item-name" style={{ fontSize: '0.95rem', margin: 0 }}>{product.name}</h4>
                      <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 700 }}>
                        Current Stock: {product.stock}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setShowLowStockModal(false);
                        handleEditProductClick(product);
                      }}
                    >
                      Update Stock
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowLowStockModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── JD Shipment Modal (2-step) ─────────────────────────────────────── */}
      {jdShipModalOpen && selectedOrderForJd && (
        <div className="modal-overlay" onClick={() => setJdShipModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="jd-ship-modal-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>

            {/* Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="jd-ship-modal-title"><span style={{ WebkitTextFillColor: 'initial' }}>🚚</span> Ship via JD WebnShip</h2>
                <p className="modal-subtitle">
                  {jdModalStep === 1
                    ? `Order ${selectedOrderForJd.id.substring(0, 8)}... — Step 1 of 2: Shipping details`
                    : `Order ${selectedOrderForJd.id.substring(0, 8)}... — Step 2 of 2: Select courier`}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setJdShipModalOpen(false)} aria-label="Close modal">✕</button>
            </div>

            {/* Step progress bar */}
            <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--primary)', opacity: 1 }} />
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--primary)', opacity: jdModalStep >= 2 ? 1 : 0.25 }} />
            </div>

            {/* ── STEP 1: Pickup address + weight ── */}
            {jdModalStep === 1 && (
              jdPickupLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner"></div>
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading pickup addresses...</p>
                </div>
              ) : (
                <form onSubmit={handleCheckServiceability} className="product-form" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Pickup Address</label>
                    {jdPickupAddresses.length === 0 ? (
                      <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>⚠️ No pickup addresses found. Add one in your JD Retailer dashboard.</p>
                    ) : (
                      <select
                        className="form-input form-select"
                        value={jdShipForm.pickup_address_id}
                        onChange={(e) => setJdShipForm({ ...jdShipForm, pickup_address_id: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select a pickup address</option>
                        {jdPickupAddresses.map(addr => (
                          <option key={addr.id} value={String(addr.id)}>
                            {addr.warehouse_name || addr.name || `ID: ${addr.id}`}
                            {addr.city ? ` — ${addr.city}` : ''}
                            {addr.pincode ? ` (${addr.pincode})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Package Weight
                    </label>
                    {jdWeightsLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 0' }}>
                        <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading weight options...</span>
                      </div>
                    ) : jdWeightOptions.length === 0 ? (
                      <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>⚠️ Could not load weight options. Please try again.</p>
                    ) : (
                      <select
                        className="form-input form-select"
                        value={jdShipForm.weight}
                        onChange={(e) => setJdShipForm({ ...jdShipForm, weight: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select package weight</option>
                        {jdWeightOptions.map(w => (
                          <option key={w.id ?? w.label} value={String(w.grams)}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setJdShipModalOpen(false)}>Cancel</button>
                    <button
                      type="submit" className="btn btn-primary"
                   disabled={jdServiceabilityLoading || jdPickupAddresses.length === 0 || !jdShipForm.weight || jdWeightsLoading}
                    >
                      {jdServiceabilityLoading ? 'Checking couriers...' : 'Check Available Couriers →'}
                    </button>
                  </div>
                </form>
              )
            )}

            {/* ── STEP 2: Courier selection ── */}
            {jdModalStep === 2 && (
              <form onSubmit={handleUpdateStatus} className="product-form" style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {availableCouriers.length} courier{availableCouriers.length !== 1 ? 's' : ''} available. Pick one:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {availableCouriers.map((courier, idx) => {
                    const isSelected = selectedCourier === courier;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedCourier(courier)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem', borderRadius: '10px', cursor: 'pointer',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                          background: isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                          transition: 'all 0.15s'
                        }}
                      >
                        {courier.logoUrl && (
                          <img src={courier.logoUrl} alt={courier.courier_name || courier.display_name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{courier.courier_name || courier.display_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {courier.service_name || courier.display_mode}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', flexShrink: 0 }}>
                          ₹{courier.total_price ?? courier.price ?? '—'}
                        </div>
                        {isSelected && <span style={{ color: 'var(--primary)', fontSize: '1.1rem', flexShrink: 0 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setJdModalStep(1)}>← Back</button>
                  <button
                    type="submit" className="btn btn-primary"
                    disabled={actionLoading === selectedOrderForJd.id || !selectedCourier}
                  >
                    {actionLoading === selectedOrderForJd.id ? 'Creating Shipment...' : 'Confirm Shipment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ── Shipment Success Receipt Modal ───────────────────────────────── */}
      {shipmentSuccessOpen && shipmentSuccessData && (
        <div className="modal-overlay" onClick={() => setShipmentSuccessOpen(false)} role="dialog" aria-modal="true" aria-labelledby="shipment-success-title">
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>

            {/* Success header */}
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0.5rem' }}>
              <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: '0.75rem' }}>🎉</div>
              <h2 id="shipment-success-title" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                Shipment Booked!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Your order has been successfully handed off to JD WebnShip.
              </p>
            </div>

            {/* Receipt card */}
            <div style={{
              margin: '1.25rem 0',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}>
              {/* Courier banner */}
              <div style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(99,102,241,0.12)',
                borderBottom: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', gap: '0.6rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🚚</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                  {shipmentSuccessData.courier}
                </span>
              </div>

              {/* Receipt rows */}
              <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>JD Shipment ID</span>
                  <strong style={{ fontSize: '0.92rem' }}>{shipmentSuccessData.shipmentId}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>AWB (Tracking No.)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <code style={{ fontWeight: 800, letterSpacing: '0.06em', fontSize: '0.95rem', color: 'var(--primary)' }}>
                      {shipmentSuccessData.awb}
                    </code>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.15rem 0.55rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        navigator.clipboard.writeText(shipmentSuccessData.awb);
                      }}
                      title="Copy AWB"
                    >📋 Copy</button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Order Reference</span>
                  <code style={{ fontSize: '0.8rem' }}>{shipmentSuccessData.orderId?.substring(0, 8)}…</code>
                </div>

              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShipmentSuccessOpen(false)}
              >
                Close
              </button>
              {shipmentSuccessData.labelUrl && (
                <a
                  href={shipmentSuccessData.labelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                >
                  🏷️ Open Shipping Label
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
