import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('shop');

  // Admin Security State (LocalStorage Supported)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  
  const [adminSecretPin, setAdminSecretPin] = useState(() => {
    return localStorage.getItem('fb_admin_pin') || '1234';
  });
  const [newPinInput, setNewPinInput] = useState('');

  // Website Logo State (Local File / Base64 Support)
  const [siteLogo, setSiteLogo] = useState(() => {
    return localStorage.getItem('fb_site_logo') || '';
  });

  // Shop Banner Background State
  const [shopBgImage, setShopBgImage] = useState(() => {
    return localStorage.getItem('fb_shop_bg') || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80';
  });

  // Payment Gateway Settings State
  const [paymentConfig, setPaymentConfig] = useState(() => {
    const saved = localStorage.getItem('fb_payment_config');
    return saved ? JSON.parse(saved) : { methodName: 'বিকাশ পার্সোনাল', accountNumber: '01722023943' };
  });
  const [tempNumber, setTempNumber] = useState(paymentConfig.accountNumber);

  // Products State
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('fb_products');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'NZMP Full Cream Milk (1 Kg)', cost: 553.2, price: 700, stock: 25, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80' },
      { id: 2, name: 'Organic Premium Honey (500g)', cost: 350, price: 550, stock: 15, image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=500&q=80' },
      { id: 3, name: 'Natural Ghee (Pure Cow)', cost: 900, price: 1250, stock: 10, image: 'https://images.unsplash.com/photo-1631379578550-7038263db699?auto=format&fit=crop&w=500&q=80' },
    ];
  });

  // Cart & Orders State
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('fb_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // Main Owner & Partners State
  const [ownerInfo, setOwnerInfo] = useState(() => {
    const saved = localStorage.getItem('fb_owner_info');
    return saved ? JSON.parse(saved) : { name: 'আনিসুর রহমান', email: 'anasur@friendsbazaar.com' };
  });
  const [tempOwner, setTempOwner] = useState(ownerInfo);

  const [partners, setPartners] = useState(() => {
    const saved = localStorage.getItem('fb_partners');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'সহ-ব্যবস্থাপক ১', email: 'partner1@friendsbazaar.com', role: 'Co-Admin' }
    ];
  });
  const [newPartner, setNewPartner] = useState({ name: '', email: '' });

  // New & Editing Product State
  const [newProd, setNewProd] = useState({ name: '', cost: '', price: '', stock: '', image: '' });
  const [editingProd, setEditingProd] = useState(null);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '', trxId: '' });
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(null);

  // --- Sync to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('fb_admin_pin', adminSecretPin);
  }, [adminSecretPin]);

  useEffect(() => {
    localStorage.setItem('fb_site_logo', siteLogo);
  }, [siteLogo]);

  useEffect(() => {
    localStorage.setItem('fb_shop_bg', shopBgImage);
  }, [shopBgImage]);

  useEffect(() => {
    localStorage.setItem('fb_payment_config', JSON.stringify(paymentConfig));
  }, [paymentConfig]);

  useEffect(() => {
    localStorage.setItem('fb_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('fb_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('fb_owner_info', JSON.stringify(ownerInfo));
  }, [ownerInfo]);

  useEffect(() => {
    localStorage.setItem('fb_partners', JSON.stringify(partners));
  }, [partners]);

  // --- Handlers for Local Image Upload (PC to Base64) ---
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSiteLogo(reader.result);
        alert('ওয়েবসাইট লোগো সফলভাবে আপডেট ও সেভ করা হয়েছে!');
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
        alert('শপ ব্যানার ব্যাকগ্রাউন্ড সফলভাবে আপডেট ও সেভ করা হয়েছে!');
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
    alert('অ্যাডমিন পিন সফলভাবে পরিবর্তন ও সেভ করা হয়েছে!');
  };

  const handleUpdateOwner = (e) => {
    e.preventDefault();
    setOwnerInfo(tempOwner);
    alert('ওনার প্রোফাইল সফলভাবে আপডেট ও সেভ করা হয়েছে!');
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
    alert('প্রোডাক্ট সফলভাবে যুক্ত ও সেভ করা হয়েছে!');
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
    alert('প্রোডাক্ট সফলভাবে আপডেট ও সেভ করা হয়েছে!');
  };

  const handleStockChange = (id, delta) => {
    setProducts(products.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
  };

  const handleAddPartner = (e) => {
    e.preventDefault();
    if (!newPartner.name || !newPartner.email) return;
    setPartners([...partners, { id: Date.now(), ...newPartner, role: 'Co-Admin' }]);
    setNewPartner({ name: '', email: '' });
    alert('নতুন পার্টনার সফলভাবে যুক্ত ও সেভ করা হয়েছে!');
  };

  const handleDeletePartner = (id) => {
    setPartners(partners.filter(pt => pt.id !== id));
  };

  const handleUpdatePayment = (e) => {
    e.preventDefault();
    setPaymentConfig({ ...paymentConfig, accountNumber: tempNumber });
    alert('পেমেন্ট নম্বর সফলভাবে আপডেট ও সেভ করা হয়েছে!');
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
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* Navbar with Dynamic Custom Logo */}
      <nav style={{ backgroundColor: '#0f172a', color: '#fff', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ fontSize: '24px', fontWeight: '900', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setActiveTab('shop')}>
          {siteLogo ? (
            <img src={siteLogo} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #38bdf8' }} />
          ) : (
            <span>🛒</span>
          )}
          <span>Friends Bazaar</span>
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
              <h1 style={{ fontSize: '40px', marginBottom: '10px', color: '#38bdf8', fontWeight: '800' }}>স্বাগতম Friends Bazaar-এ</h1>
              <p style={{ fontSize: '18px', color: '#cbd5e1' }}>খাঁটি, নিরাপদ ও প্রিমিয়াম কোয়ালিটি পণ্য অর্ডার করুন খুব সহজেই ঘরে বসে।</p>
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
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>শুধুমাত্র ওনার বা কো-অ্যাডমিন প্রবেশ করতে পারবেন। (আপনার সেভ করা পিন দিন)</p>
                <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input type="password" placeholder="সিক্রেট পিন দিন" required value={adminPinInput} onChange={e => setAdminPinInput(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '18px', letterSpacing: '3px' }} />
                  <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>প্রবেশ করুন</button>
                </form>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h2 style={{ fontSize: '28px', color: '#0f172a', margin: 0 }}>⚙️ Friends Bazaar সিকিউরড কন্ট্রোল প্যানেল</h2>
                  <button onClick={() => setIsAdminLoggedIn(false)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>লগআউট</button>
                </div>

                {/* Security, Logo & Banner Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                  
                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                    <h3>🔐 সিক্রেট পিন পরিবর্তন</h3>
                    <form onSubmit={handleUpdatePin} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <input type="password" placeholder="নতুন পিন" required value={newPinInput} onChange={e => setNewPinInput(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }} />
                      <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>পরিবর্তন</button>
                    </form>
                  </div>

                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                    <h3>🖼️ ওয়েবসাইট লোগো পরিবর্তন (পিসি থেকে)</h3>
                    <div style={{ marginTop: '10px' }}>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ width: '100%', fontSize: '13px' }} />
                      <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>নামের পাশের আইকন ও লোগো বদলে যাবে।</small>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                    <h3>🎨 শপ ব্যাকগ্রাউন্ড পরিবর্তন (পিসি থেকে)</h3>
                    <div style={{ marginTop: '10px' }}>
                      <input type="file" accept="image/*" onChange={handleBgImageUpload} style={{ width: '100%', fontSize: '13px' }} />
                      <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>ব্যানার ব্যাকগ্রাউন্ড ছবি বদলাবে।</small>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                    <h3>👤 ওনার প্রোফাইল এডিট</h3>
                    <form onSubmit={handleUpdateOwner} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      <input type="text" value={tempOwner.name} onChange={e => setTempOwner({...tempOwner, name: e.target.value})} placeholder="আপনার নাম" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="email" value={tempOwner.email} onChange={e => setTempOwner({...tempOwner, email: e.target.value})} placeholder="আপনার জিমেইল" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <button type="submit" style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>আপডেট</button>
                    </form>
                  </div>

                </div>

                {/* Payment Gateway Settings Box */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid #cbd5e1' }}>
                  <h3>💳 পেমেন্ট গেটওয়ে সেটিংস (বিকাশ নম্বর পরিবর্তন করুন)</h3>
                  <form onSubmit={handleUpdatePayment} style={{ display: 'flex', gap: '15px', marginTop: '10px', alignItems: 'center' }}>
                    <input type="text" value={tempNumber} onChange={e => setTempNumber(e.target.value)} placeholder="নতুন বিকাশ নম্বর" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '250px' }} />
                    <button type="submit" style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>নম্বর আপডেট করুন</button>
                  </form>
                  <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>বর্তমান একটিভ নম্বর: <strong>{paymentConfig.accountNumber}</strong></small>
                </div>

                {/* Financial Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', borderLeft: '6px solid #0284c7' }}>
                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>মোট রেভিনিউ</span>
                    <h3 style={{ margin: '8px 0 0 0', color: '#0284c7', fontSize: '24px' }}>৳ {totalRevenue}</h3>
                  </div>
                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', borderLeft: '6px solid #059669' }}>
                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>মোট নিট প্রফিট</span>
                    <h3 style={{ margin: '8px 0 0 0', color: '#059669', fontSize: '24px' }}>৳ {totalProfit}</h3>
                  </div>
                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', borderLeft: '6px solid #f59e0b' }}>
                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>মোট অর্ডার</span>
                    <h3 style={{ margin: '8px 0 0 0', color: '#f59e0b', fontSize: '24px' }}>{orders.length} টি</h3>
                  </div>
                </div>

                {/* Product Management */}
                <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', marginBottom: '30px' }}>
                  <h3>📦 প্রোডাক্ট লিস্ট ও ম্যানেজমেন্ট (পিসি থেকে ছবি আপলোড)</h3>
                  <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '15px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px', alignItems: 'center' }}>
                    <input type="text" placeholder="প্রোডাক্ট নাম" required value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="number" placeholder="কস্টিং (৳)" required value={newProd.cost} onChange={e => setNewProd({...newProd, cost: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="number" placeholder="বিক্রয় মূল্য (৳)" required value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="number" placeholder="স্টক পরিমাণ" required value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', marginBottom: '2px', color: '#475569' }}>পিসি থেকে ছবি দিন:</label>
                      <input type="file" accept="image/*" onChange={(e) => handleProductImageUpload(e, false)} style={{ fontSize: '11px' }} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}>নতুন যুক্ত করুন</button>
                  </form>

                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px' }}>প্রোডাক্ট</th>
                        <th style={{ padding: '10px' }}>কস্টিং</th>
                        <th style={{ padding: '10px' }}>মূল্য</th>
                        <th style={{ padding: '10px' }}>প্রফিট</th>
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
                          <td style={{ padding: '10px', color: '#ef4444' }}>৳ {p.cost}</td>
                          <td style={{ padding: '10px', color: '#059669' }}>৳ {p.price}</td>
                          <td style={{ padding: '10px', color: '#d97706', fontWeight: 'bold' }}>৳ {p.price - p.cost}</td>
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

                {/* Edit Product Modal */}
                {editingProd && (
                  <div style={{ background: '#e0f2fe', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
                    <h3>✏️ প্রোডাক্ট এডিট করুন: {editingProd.name}</h3>
                    <form onSubmit={handleUpdateProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                      <input type="text" value={editingProd.name} onChange={e => setEditingProd({...editingProd, name: e.target.value})} style={{ padding: '8px', borderRadius: '6px' }} />
                      <input type="number" value={editingProd.cost} onChange={e => setEditingProd({...editingProd, cost: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '6px' }} />
                      <input type="number" value={editingProd.price} onChange={e => setEditingProd({...editingProd, price: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '6px' }} />
                      <input type="number" value={editingProd.stock} onChange={e => setEditingProd({...editingProd, stock: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '6px' }} />
                      <div>
                        <label style={{ fontSize: '11px', display: 'block' }}>নতুন ছবি দিন (ঐচ্ছিক):</label>
                        <input type="file" accept="image/*" onChange={(e) => handleProductImageUpload(e, true)} style={{ fontSize: '11px' }} />
                      </div>
                      <button type="submit" style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', padding: '8px' }}>আপডেট কনফার্ম</button>
                      <button type="button" onClick={() => setEditingProd(null)} style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px' }}>বাতিল</button>
                    </form>
                  </div>
                )}

                {/* Customer Orders & Partners */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px' }}>
                    <h3>📋 রিয়েল কাস্টমার অর্ডারসমূহ</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '15px' }}>
                      {orders.length === 0 ? (
                        <p style={{ color: '#64748b' }}>এখনও কোনো অর্ডার আসেনি।</p>
                      ) : (
                        orders.map(o => (
                          <div key={o.id} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', backgroundColor: '#f8fafc', marginBottom: '10px', borderRadius: '8px' }}>
                            <strong>অর্ডার আইডি: {o.id}</strong> ({o.date})<br/>
                            কাস্টমার: {o.customer} ({o.phone})<br/>
                            ঠিকানা: {o.address}<br/>
                            বিকাশ TrxID: <code style={{ color: '#e11d48' }}>{o.trxId}</code><br/>
                            মোট মূল্য: <strong>৳ {o.total}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px' }}>
                    <h3>👥 পার্টনার / কো-অ্যাডমিন ম্যানেজমেন্ট</h3>
                    <form onSubmit={handleAddPartner} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                      <input type="text" placeholder="পার্টনারের নাম" required value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="email" placeholder="পার্টনারের জিমেইল" required value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>পার্টনার যুক্ত করুন</button>
                    </form>
                    <ul style={{ marginTop: '15px', paddingLeft: '0', listStyle: 'none' }}>
                      <li style={{ marginBottom: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>{ownerInfo.name}</strong> ({ownerInfo.email}) - <strong style={{ color: '#0284c7' }}>Owner</strong></span>
                      </li>
                      {partners.map(pt => (
                        <li key={pt.id} style={{ marginBottom: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><strong>{pt.name}</strong> ({pt.email})</span>
                          <button onClick={() => handleDeletePartner(pt.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>রিমুভ</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
