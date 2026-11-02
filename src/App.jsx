import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('shop');

  // Admin Security State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminSecretPin, setAdminSecretPin] = useState('1234'); 
  const [newPinInput, setNewPinInput] = useState('');

  // Website Logo & Banner State
  const [siteLogo, setSiteLogo] = useState('');
  const [shopBgImage, setShopBgImage] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80');

  // Permanent Business & Contact Info (এখানে আপনার ঠিকানা ও কন্টাক্ট ইনফো স্থায়ীভাবে সেট করা আছে)
  const [businessInfo, setBusinessInfo] = useState({
    shopName: 'Friends Bazaar',
    address: 'আশুগঞ্জ, ব্রাহ্মণবাড়িয়া, বাংলাদেশ',
    phone: '01722023943',
    email: 'anasur@friendsbazaar.com',
    description: 'খাঁটি, নিরাপদ ও প্রিমিয়াম কোয়ালিটি পণ্য অর্ডার করুন খুব সহজেই ঘরে বসে।'
  });
  const [tempBusiness, setTempBusiness] = useState(businessInfo);

  // Payment Gateway Settings State
  const [paymentConfig, setPaymentConfig] = useState({ 
    methodName: 'বিকাশ পার্সোনাল', 
    accountNumber: '01722023943' 
  });
  const [tempNumber, setTempNumber] = useState(paymentConfig.accountNumber);

  // Products State (স্থায়ী প্রোডাক্ট লিস্ট)
  const [products, setProducts] = useState([
    { id: 1, name: 'NZMP Full Cream Milk (1 Kg)', cost: 553.2, price: 700, stock: 25, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80' },
    { id: 2, name: 'Organic Premium Honey (500g)', cost: 350, price: 550, stock: 15, image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=500&q=80' },
    { id: 3, name: 'Natural Ghee (Pure Cow)', cost: 900, price: 1250, stock: 10, image: 'https://images.unsplash.com/photo-1631379578550-7038263db699?auto=format&fit=crop&w=500&q=80' },
  ]);

  // Cart & Orders State
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);

  // New & Editing Product State
  const [newProd, setNewProd] = useState({ name: '', cost: '', price: '', stock: '', image: '' });
  const [editingProd, setEditingProd] = useState(null);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '', trxId: '' });
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(null);

  // Handlers
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSiteLogo(reader.result);
        alert('লোগো আপডেট করা হয়েছে!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setShopBgImage(reader.result);
        alert('ব্যানার ব্যাকগ্রাউন্ড আপডেট করা হয়েছে!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductImageUpload = (e, isEditing = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditing) {
          setEditingProd({ ...editingProd, image: reader.result });
        } else {
          setNewProd({ ...newProd, image: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPinInput === adminSecretPin) {
      setIsAdminLoggedIn(true);
      setAdminPinInput('');
    } else {
      alert('ভুল সিক্রেট পিন!');
      setAdminPinInput('');
    }
  };

  const handleUpdatePin = (e) => {
    e.preventDefault();
    if (!newPinInput || newPinInput.length < 4) {
      alert('কমপক্ষে ৪ সংখ্যার পিন দিন।');
      return;
    }
    setAdminSecretPin(newPinInput);
    setNewPinInput('');
    alert('অ্যাডমিন পিন পরিবর্তন করা হয়েছে!');
  };

  const handleUpdateBusinessInfo = (e) => {
    e.preventDefault();
    setBusinessInfo(tempBusiness);
    alert('দোকানের ঠিকানা ও তথ্য আপডেট করা হয়েছে!');
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('দুঃখিত, এই প্রোডাক্টটি বর্তমানে স্টকে নেই!');
      return;
    }
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        alert('স্টকের বেশি প্রোডাক্ট কার্টে যোগ করা যাবে না।');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateCartQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }).filter(Boolean));
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.cost || !newProd.price || !newProd.stock) return;
    const item = {
      id: Date.now(),
      name: newProd.name,
      cost: Number(newProd.cost),
      price: Number(newProd.price),
      stock: Number(newProd.stock),
      image: newProd.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'
    };
    setProducts([...products, item]);
    setNewProd({ name: '', cost: '', price: '', stock: '', image: '' });
    alert('নতুন প্রোডাক্ট যুক্ত করা হয়েছে!');
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('আপনি কি নিশ্চিত এই প্রোডাক্টটি মুছে ফেলতে চান?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleUpdateProduct = (e) => {
    e.preventDefault();
    setProducts(products.map(p => p.id === editingProd.id ? editingProd : p));
    setEditingProd(null);
    alert('প্রোডাক্ট আপডেট করা হয়েছে!');
  };

  const handleStockChange = (id, delta) => {
    setProducts(products.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
  };

  const handleUpdatePayment = (e) => {
    e.preventDefault();
    setPaymentConfig({ ...paymentConfig, accountNumber: tempNumber });
    alert('পেমেন্ট নম্বর আপডেট করা হয়েছে!');
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    let totalAmount = 0;
    let totalCost = 0;

    const updatedProducts = products.map(p => {
      const cartItem = cart.find(ci => ci.id === p.id);
      if (cartItem) {
        totalAmount += cartItem.price * cartItem.qty;
        totalCost += cartItem.cost * cartItem.qty;
        return { ...p, stock: p.stock - cartItem.qty };
      }
      return p;
    });

    setProducts(updatedProducts);

    const newOrder = {
      id: 'FB-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toLocaleDateString(),
      customer: checkoutForm.name,
      phone: checkoutForm.phone,
      address: checkoutForm.address,
      items: [...cart],
      total: totalAmount,
      cost: totalCost,
      profit: totalAmount - totalCost,
      trxId: checkoutForm.trxId,
      status: 'Pending'
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    setOrderPlacedSuccess(newOrder.id);
    setCheckoutForm({ name: '', phone: '', address: '', trxId: '' });
  };

  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const totalProfit = orders.reduce((acc, o) => acc + o.profit, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      <div>
        {/* Navbar */}
        <nav style={{ backgroundColor: '#0f172a', color: '#fff', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setActiveTab('shop')}>
            {siteLogo ? (
              <img src={siteLogo} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #38bdf8' }} />
            ) : (
              <span>🛒</span>
            )}
            <span>{businessInfo.shopName}</span>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button onClick={() => setActiveTab('shop')} style={{ background: activeTab === 'shop' ? '#38bdf8' : 'transparent', color: activeTab === 'shop' ? '#0f172a' : '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              🛍️ শপ
            </button>
            <button onClick={() => setActiveTab('cart')} style={{ background: activeTab === 'cart' ? '#38bdf8' : 'transparent', color: activeTab === 'cart' ? '#0f172a' : '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              🛒 কার্ট ({cart.reduce((a, b) => a + b.qty, 0)})
            </button>
            <button onClick={() => setActiveTab('admin')} style={{ background: activeTab === 'admin' ? '#f43f5e' : '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⚙️ অ্যাডমিন প্যানেল
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>

          {/* 1. SHOP PAGE */}
          {activeTab === 'shop' && (
            <div>
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '40px', 
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.85)), url("${shopBgImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                padding: '60px 20px', 
                borderRadius: '20px', 
                color: '#fff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <h1 style={{ fontSize: '40px', marginBottom: '10px', color: '#38bdf8', fontWeight: '800' }}>স্বাগতম {businessInfo.shopName}-এ</h1>
                <p style={{ fontSize: '18px', color: '#cbd5e1' }}>{businessInfo.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
                {products.map(p => (
                  <div key={p.id} style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#0f172a' }}>{p.name}</h3>
                        <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#059669', margin: '0 0 10px 0' }}>৳ {p.price}</p>
                        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', backgroundColor: p.stock > 0 ? '#d1fae5' : '#fee2e2', color: p.stock > 0 ? '#065f46' : '#991b1b', fontWeight: 'bold' }}>
                          {p.stock > 0 ? `স্টক আছে: ${p.stock} টি` : 'স্টক আউট'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => addToCart(p)} disabled={p.stock <= 0} style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Add to Cart
                        </button>
                        <button onClick={() => { addToCart(p); setActiveTab('cart'); }} disabled={p.stock <= 0} style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. CART & CHECKOUT PAGE */}
          {activeTab === 'cart' && (
            <div>
              <h2 style={{ fontSize: '26px', marginBottom: '20px', color: '#0f172a' }}>আপনার শপিং কার্ট ও পেমেন্ট</h2>
              {orderPlacedSuccess ? (
                <div style={{ backgroundColor: '#d1fae5', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
                  <h3 style={{ color: '#065f46', fontSize: '24px', marginBottom: '10px' }}>অর্ডার সফলভাবে সম্পন্ন হয়েছে! 🎉</h3>
                  <p style={{ fontSize: '16px', color: '#047857' }}>অর্ডার আইডি: <strong>{orderPlacedSuccess}</strong></p>
                  <p style={{ color: '#334155', marginTop: '10px' }}>আমরা আপনার পেমেন্ট যাচাই করে দ্রুত পার্সেল পাঠিয়ে দেব।</p>
                  <button onClick={() => { setOrderPlacedSuccess(null); setActiveTab('shop'); }} style={{ marginTop: '20px', backgroundColor: '#059669', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    আরও কেনাকাটা করুন
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div style={{ backgroundColor: '#fff', padding: '50px', textAlign: 'center', borderRadius: '16px' }}>
                  <p style={{ fontSize: '18px', color: '#64748b' }}>আপনার কার্ট খালি রয়েছে।</p>
                  <button onClick={() => setActiveTab('shop')} style={{ marginTop: '15px', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    শপে ফিরে যান
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px' }}>
                    <h3>সিলেক্ট করা প্রোডাক্টসমূহ</h3>
                    {cart.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <h4 style={{ margin: '0 0 5px 0' }}>{item.name}</h4>
                          <span style={{ color: '#059669', fontWeight: 'bold' }}>৳ {item.price} x {item.qty}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button onClick={() => updateCartQty(item.id, -1)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>-</button>
                          <span style={{ fontWeight: 'bold' }}>{item.qty}</span>
                          <button onClick={() => updateCartQty(item.id, 1)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>+</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', marginTop: '20px', fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
                      মোট প্রদেয়: <span style={{ color: '#059669' }}>৳ {cartTotal}</span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px' }}>
                    <h3>পেমেন্ট ও ডেলিভারি তথ্য</h3>
                    <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#be185d' }}>
                      <strong>{paymentConfig.methodName}:</strong> <code>{paymentConfig.accountNumber}</code><br/>
                      এই নম্বরে সেন্ড মানি করে ট্রানজেকশন আইডি নিচে দিন।
                    </div>
                    <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <input type="text" placeholder="আপনার নাম" required value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <input type="tel" placeholder="মোবাইল নম্বর" required value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <textarea placeholder="পূর্ণাঙ্গ ঠিকানা" required value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', height: '70px' }}></textarea>
                      <input type="text" placeholder="বিকাশ TrxID" required value={checkoutForm.trxId} onChange={e => setCheckoutForm({...checkoutForm, trxId: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <button type="submit" style={{ backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                        অর্ডার কনফার্ম করুন (৳ {cartTotal})
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. SECURE ADMIN DASHBOARD */}
          {activeTab === 'admin' && (
            <div>
              {!isAdminLoggedIn ? (
                <div style={{ maxWidth: '400px', margin: '50px auto', backgroundColor: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <h3 style={{ color: '#0f172a', marginBottom: '15px' }}>🔒 সিক্রেট এডমিন লগইন</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>ডিফল্ট পিন: <strong>1234</strong></p>
                  <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input type="password" placeholder="সিক্রেট পিন দিন" required value={adminPinInput} onChange={e => setAdminPinInput(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '18px', letterSpacing: '3px' }} />
                    <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>প্রবেশ করুন</button>
                  </form>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ fontSize: '28px', color: '#0f172a', margin: 0 }}>⚙️ কন্ট্রোল প্যানেল</h2>
                    <button onClick={() => setIsAdminLoggedIn(false)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>লগআউট</button>
                  </div>

                  {/* Settings Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                    
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                      <h3>🔐 পিন পরিবর্তন</h3>
                      <form onSubmit={handleUpdatePin} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <input type="password" placeholder="নতুন পিন" required value={newPinInput} onChange={e => setNewPinInput(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }} />
                        <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>সেভ</button>
                      </form>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                      <h3>📍 দোকান ও ঠিকানা আপডেট</h3>
                      <form onSubmit={handleUpdateBusinessInfo} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                        <input type="text" value={tempBusiness.shopName} onChange={e => setTempBusiness({...tempBusiness, shopName: e.target.value})} placeholder="দোকানের নাম" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        <input type="text" value={tempBusiness.address} onChange={e => setTempBusiness({...tempBusiness, address: e.target.value})} placeholder="ঠিকানা" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        <input type="text" value={tempBusiness.phone} onChange={e => setTempBusiness({...tempBusiness, phone: e.target.value})} placeholder="মোবাইল নম্বর" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        <button type="submit" style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>ঠিকানা আপডেট</button>
                      </form>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                      <h3>🖼️ লোগো ও ব্যানার</h3>
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize: '11px' }} />
                        <input type="file" accept="image/*" onChange={handleBgImageUpload} style={{ fontSize: '11px' }} />
                      </div>
                    </div>

                  </div>

                  {/* Payment Gateway Settings Box */}
                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid #cbd5e1' }}>
                    <h3>💳 বিকাশ নম্বর পরিবর্তন</h3>
                    <form onSubmit={handleUpdatePayment} style={{ display: 'flex', gap: '15px', marginTop: '10px', alignItems: 'center' }}>
                      <input type="text" value={tempNumber} onChange={e => setTempNumber(e.target.value)} placeholder="নতুন বিকাশ নম্বর" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '250px' }} />
                      <button type="submit" style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>নম্বর আপডেট করুন</button>
                    </form>
                  </div>

                  {/* Product Management */}
                  <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', marginBottom: '30px' }}>
                    <h3>📦 প্রোডাক্ট লিস্ট ও ম্যানেজমেন্ট</h3>
                    <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '15px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px', alignItems: 'center' }}>
                      <input type="text" placeholder="প্রোডাক্ট নাম" required value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="number" placeholder="কস্টিং (৳)" required value={newProd.cost} onChange={e => setNewProd({...newProd, cost: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="number" placeholder="বিক্রয় মূল্য (৳)" required value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="number" placeholder="স্টক পরিমাণ" required value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <div>
                        <input type="file" accept="image/*" onChange={(e) => handleProductImageUpload(e, false)} style={{ fontSize: '11px' }} />
                      </div>
                      <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}>যুক্ত করুন</button>
                    </form>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px' }}>প্রোডাক্ট</th>
                          <th style={{ padding: '10px' }}>মূল্য</th>
                          <th style={{ padding: '10px' }}>স্টক</th>
                          <th style={{ padding: '10px' }}>অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img src={p.image} alt="" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                              {p.name}
                            </td>
                            <td style={{ padding: '10px', color: '#059669' }}>৳ {p.price}</td>
                            <td style={{ padding: '10px' }}>
                              <button onClick={() => handleStockChange(p.id, -1)} style={{ padding: '2px 6px', marginRight: '5px' }}>-</button>
                              {p.stock}
                              <button onClick={() => handleStockChange(p.id, 1)} style={{ padding: '2px 6px', marginLeft: '5px' }}>+</button>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <button onClick={() => setEditingProd(p)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>এডিট</button>
                              <button onClick={() => handleDeleteProduct(p.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>ডিলিট</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Footer / Contact Us Section (স্থায়ী ঠিকানা ও কন্টাক্ট সেকশন) */}
      <footer style={{ backgroundColor: '#0f172a', color: '#cbd5e1', padding: '40px 20px', marginTop: '60px', borderTop: '4px solid #38bdf8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          <div>
            <h3 style={{ color: '#38bdf8', marginBottom: '15px' }}>{businessInfo.shopName}</h3>
            <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{businessInfo.description}</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '15px' }}>📍 আমাদের ঠিকানা (Address)</h4>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>{businessInfo.address}</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '15px' }}>📞 কন্টাক্ট আস (Contact Us)</h4>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>মোবাইল: <strong>{businessInfo.phone}</strong></p>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>ইমেইল: <strong>{businessInfo.email}</strong></p>
          </div>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #1e293b', marginTop: '30px', paddingTop: '20px', fontSize: '13px', color: '#64748b' }}>
          © {new Date().getFullYear()} {businessInfo.shopName}. All Rights Reserved. Powered by Vercel.
        </div>
      </footer>

    </div>
  );
}
