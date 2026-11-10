import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase';

const DEFAULT_SETTINGS = {
  owner: {
    name: 'Md Anasur Rahman',
    email: 'anasurrahman5@gmail.com',
    phone: '01722023943',
    address: 'আশুগঞ্জ, ব্রাহ্মণবাড়িয়া, বাংলাদেশ',
    description: 'খাঁটি, নিরাপদ ও প্রিমিয়াম কোয়ালিটি পণ্য অর্ডার করুন খুব সহজেই ঘরে বসে।'
  },
  payment: {
    methodName: 'বিকাশ পার্সোনাল',
    accountNumber: '01722023943'
  },
  logo: '',
  banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
};

const money = n => `৳ ${Number(n || 0).toLocaleString('en-BD')}`;

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '15px'
};

const btn = (bg = '#0f172a') => ({
  background: bg,
  color: '#fff',
  border: 0,
  padding: '12px 18px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700
});

const panel = {
  background: '#fff',
  padding: 25,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  marginBottom: 25
};

export default function App() {
  const [tab, setTab] = useState('shop');
  const [session, setSession] = useState(null);
  const [adminRole, setAdminRole] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [cart, setCart] = useState([]);

  const [checkout, setCheckout] = useState({
    name: '',
    phone: '',
    address: '',
    trxId: ''
  });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [newProduct, setNewProduct] = useState({
    name: '',
    cost: '',
    price: '',
    stock: '',
    description: '',
    benefits: '',
    drawbacks: '',
    image_url: '',
    images: []
  });

  const [editing, setEditing] = useState(null);

  const isAdmin = ['admin', 'owner'].includes(adminRole);

  // Authentication
  useEffect(() => {
    if (!isConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        setSession(next);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Load website data
  const loadAll = useCallback(async () => {
    if (!isConfigured) return;

    try {
      const [p, s] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('site_settings')
          .select('value')
          .eq('id', 1)
          .maybeSingle()
      ]);

      if (p.error) {
        setNotice(p.error.message);
      } else {
        setProducts(p.data || []);
      }

      const nextSettings = s.data?.value || DEFAULT_SETTINGS;

      setSettings({
        ...DEFAULT_SETTINGS,
        ...nextSettings,
        owner: {
          ...DEFAULT_SETTINGS.owner,
          ...(nextSettings.owner || {})
        },
        payment: {
          ...DEFAULT_SETTINGS.payment,
          ...(nextSettings.payment || {})
        }
      });

      if (session) {
        const o = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (!o.error) {
          setOrders(o.data || []);
        }

        const pt = await supabase
          .from('partners')
          .select('*')
          .order('created_at');

        if (!pt.error) {
          setPartners(pt.data || []);
        }
      }
    } catch (error) {
      setNotice(error.message || 'ডেটা লোড করা যায়নি।');
    }
  }, [session]);

  // Check admin role
  useEffect(() => {
    let active = true;

    async function checkRole() {
      if (!session?.user?.id) {
        setAdminRole('');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (active) {
        setAdminRole(error ? '' : (data?.role || ''));
      }
    }

    checkRole();

    return () => {
      active = false;
    };
  }, [session]);

  // Load data when authentication changes
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Cart calculation
  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price) * item.qty,
      0
    );
  }, [cart]);

  // Admin login
  async function login(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setNotice('লগইন হয়নি: ' + error.message);
      } else {
        setPassword('');
        setNotice('লগইন সফল হয়েছে।');
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Admin logout
  async function logout() {
    await supabase.auth.signOut();

    setOrders([]);
    setPartners([]);
    setAdminRole('');
    setTab('shop');
  }

  // Add product to cart
  function addToCart(p) {
    if (p.stock < 1) {
      return setNotice('দুঃখিত, পণ্যটি স্টকে নেই।');
    }

    const found = cart.find(x => x.id === p.id);

    if (found && found.qty >= p.stock) {
      return setNotice('স্টকের বেশি কার্টে যোগ করা যাবে না।');
    }

    setCart(old =>
      found
        ? old.map(x =>
            x.id === p.id
              ? { ...x, qty: x.qty + 1 }
              : x
          )
        : [...old, { ...p, qty: 1 }]
    );
  }

  // Change cart quantity
  function changeQty(id, delta) {
    setCart(old =>
      old
        .map(x =>
          x.id === id
            ? {
                ...x,
                qty: Math.max(
                  0,
                  Math.min(Number(x.stock), x.qty + delta)
                )
              }
            : x
        )
        .filter(x => x.qty > 0)
    );
  }

  // Place order
  async function placeOrder(e) {
    e.preventDefault();

    if (!cart.length || busy) return;

    setBusy(true);

    try {
      const items = cart.map(x => ({
        product_id: x.id,
        qty: x.qty
      }));

      const { data, error } = await supabase.rpc(
        'create_public_order',
        {
          p_customer_name: checkout.name.trim(),
          p_phone: checkout.phone.trim(),
          p_address: checkout.address.trim(),
          p_trx_id: checkout.trxId.trim(),
          p_items: items
        }
      );

      if (error) {
        setNotice('অর্ডার করা যায়নি: ' + error.message);
        return;
      }

      setNotice(
        `অর্ডার সফলভাবে গ্রহণ করা হয়েছে। অর্ডার নম্বর: ${
          data?.order_code || 'তৈরি হয়েছে'
        }`
      );

      setCart([]);

      setCheckout({
        name: '',
        phone: '',
        address: '',
        trxId: ''
      });

      await loadAll();

    } catch (error) {
      setNotice(error.message || 'অর্ডার সম্পন্ন করা যায়নি।');
    } finally {
      setBusy(false);
    }
  }

  // Upload image
  async function uploadImage(file, path) {
    if (!file) return '';

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    const key = `${path}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('site-assets')
      .upload(key, file);

    if (error) throw error;

    return supabase.storage
      .from('site-assets')
      .getPublicUrl(key)
      .data.publicUrl;
  }

  // Multiple image upload
  async function handleMultipleImagesUpload(e) {
    const files = Array.from(e.target.files);

    if (!files.length || busy) return;

    setBusy(true);

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const url = await uploadImage(file, 'products');

        if (url) {
          uploadedUrls.push(url);
        }
      }

      const target = editing || newProduct;

      const combinedImages = [
        ...(target.images || []),
        ...uploadedUrls
      ];

      if (editing) {
        setEditing({
          ...editing,
          images: combinedImages,
          image_url: target.image_url || combinedImages[0]
        });
      } else {
        setNewProduct({
          ...newProduct,
          images: combinedImages,
          image_url: combinedImages[0]
        });
      }

      setNotice('ছবি আপলোড সফল হয়েছে!');

    } catch (error) {
      setNotice(error.message || 'ছবি আপলোড করা যায়নি।');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  // Save product
  async function saveProduct(e) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);

    try {
      const source = editing || newProduct;

      const allImages = source.images?.length
        ? source.images
        : source.image_url
          ? [source.image_url]
          : [];

      const row = {
        name: source.name.trim(),
        cost: Number(source.cost),
        price: Number(source.price),
        stock: Number(source.stock),
        description: source.description || '',
        benefits: source.benefits || '',
        drawbacks: source.drawbacks || '',
        image_url: allImages[0] || null,
        images: allImages
      };

      const result = editing
        ? await supabase
            .from('products')
            .update(row)
            .eq('id', editing.id)
        : await supabase
            .from('products')
            .insert(row);

      if (result.error) {
        throw result.error;
      }

      setEditing(null);

      setNewProduct({
        name: '',
        cost: '',
        price: '',
        stock: '',
        description: '',
        benefits: '',
        drawbacks: '',
        image_url: '',
        images: []
      });

      await loadAll();

      setNotice('পণ্য সংরক্ষিত হয়েছে।');

    } catch (error) {
      setNotice(error.message || 'পণ্য সংরক্ষণ করা যায়নি।');
    } finally {
      setBusy(false);
    }
  }

  // Main website
  return (
    <div
      style={{
        fontFamily: 'Inter,Arial,sans-serif',
        background: '#f8fafc',
        minHeight: '100vh',
        color: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div>

        {/* Navigation */}
        <nav
          style={{
            background: '#0f172a',
            color: '#fff',
            padding: '15px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div
            onClick={() => setTab('shop')}
            style={{
              cursor: 'pointer',
              fontSize: 22,
              fontWeight: 900,
              color: '#38bdf8'
            }}
          >
            Friends Bazar
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={btn(tab === 'shop' ? '#38bdf8' : '#334155')}
              onClick={() => setTab('shop')}
            >
              🛍️ শপ
            </button>

            <button
              style={btn(tab === 'cart' ? '#38bdf8' : '#334155')}
              onClick={() => setTab('cart')}
            >
              🛒 কার্ট ({cart.reduce((a, b) => a + b.qty, 0)})
            </button>

            <button
              style={btn(tab === 'admin' ? '#e11d48' : '#334155')}
              onClick={() => setTab('admin')}
            >
              ⚙️ অ্যাডমিন
            </button>
          </div>
        </nav>

        {/* Notification */}
        {notice && (
          <div
            onClick={() => setNotice('')}
            style={{
              background: '#38bdf8',
              color: '#0f172a',
              padding: 10,
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            {notice} ✕
          </div>
        )}

        <main
          style={{
            maxWidth: 1200,
            margin: '30px auto',
            padding: '0 20px'
          }}
        >

          {/* Shop */}
          {tab === 'shop' && (
            <div>

              <section
                style={{
                  backgroundImage: `linear-gradient(#0f172acc,#1e293bcc),url("${settings.banner}")`,
                  backgroundSize: 'cover',
                  padding: '60px 20px',
                  borderRadius: 20,
                  textAlign: 'center',
                  color: '#fff',
                  marginBottom: 40
                }}
              >
                <h1 style={{ fontSize: 38, color: '#38bdf8' }}>
                  স্বাগতম Friends Bazaar-এ
                </h1>

                <p>{settings.owner.description}</p>
              </section>

              {/* Product Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 25
                }}
              >
                {products.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      onClick={() => {
                        setSelectedProduct(p);
                        setActiveImageIndex(0);
                      }}
                      style={{
                        cursor: 'pointer',
                        height: 200,
                        background: '#f1f5f9'
                      }}
                    >
                      <img
                        src={
                          p.image_url ||
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'
                        }
                        alt={p.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>

                    <div
                      style={{
                        padding: 20,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <h3
                          onClick={() => {
                            setSelectedProduct(p);
                            setActiveImageIndex(0);
                          }}
                          style={{
                            cursor: 'pointer',
                            fontSize: 18,
                            marginBottom: 8
                          }}
                        >
                          {p.name}
                        </h3>

                        <strong
                          style={{
                            color: '#059669',
                            fontSize: 22
                          }}
                        >
                          {money(p.price)}
                        </strong>

                        <p
                          style={{
                            fontSize: 13,
                            color: p.stock > 0 ? '#059669' : '#dc2626'
                          }}
                        >
                          {p.stock > 0
                            ? `স্টক আছে: ${p.stock} টি`
                            : 'স্টক আউট'}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 10,
                          marginTop: 20
                        }}
                      >
                        <button
                          style={{ ...btn('#0284c7'), flex: 1 }}
                          disabled={p.stock < 1}
                          onClick={() => addToCart(p)}
                        >
                          কার্টে যোগ
                        </button>

                        <button
                          style={{ ...btn('#059669'), flex: 1 }}
                          disabled={p.stock < 1}
                          onClick={() => {
                            addToCart(p);
                            setTab('cart');
                          }}
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Details Modal */}
              {selectedProduct && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.75)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 3000,
                    padding: 20
                  }}
                >
                  <div
                    style={{
                      background: '#fff',
                      padding: 30,
                      borderRadius: 20,
                      maxWidth: 700,
                      width: '100%',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      position: 'relative'
                    }}
                  >
                    <button
                      onClick={() => setSelectedProduct(null)}
                      style={{
                        position: 'absolute',
                        top: 15,
                        right: 15,
                        background: '#ef4444',
                        color: '#fff',
                        border: 0,
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>

                    <h2>{selectedProduct.name}</h2>

                    <strong
                      style={{
                        color: '#059669',
                        fontSize: 24
                      }}
                    >
                      {money(selectedProduct.price)}
                    </strong>

                    <div
                      style={{
                        textAlign: 'center',
                        margin: '15px 0'
                      }}
                    >
                      <img
                        src={
                          (selectedProduct.images &&
                            selectedProduct.images[activeImageIndex]) ||
                          selectedProduct.image_url
                        }
                        alt=""
                        style={{
                          maxHeight: 250,
                          width: '100%',
                          objectFit: 'contain',
                          borderRadius: 8
                        }}
                      />

                      {selectedProduct.images?.length > 1 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            justifyContent: 'center',
                            marginTop: 10,
                            overflowX: 'auto'
                          }}
                        >
                          {selectedProduct.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt=""
                              onClick={() => setActiveImageIndex(idx)}
                              style={{
                                width: 55,
                                height: 55,
                                objectFit: 'cover',
                                borderRadius: 6,
                                border:
                                  activeImageIndex === idx
                                    ? '2px solid #0284c7'
                                    : '2px solid transparent',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <p>
                      <b>বিবরণ:</b> {selectedProduct.description || 'নেই'}
                    </p>

                    <p>
                      <b>সুবিধা:</b> {selectedProduct.benefits || 'নেই'}
                    </p>

                    <p>
                      <b>সতর্কতা:</b> {selectedProduct.drawbacks || 'নেই'}
                    </p>

                    <button
                      style={{
                        ...btn('#059669'),
                        width: '100%',
                        marginTop: 20
                      }}
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                        setTab('cart');
                      }}
                    >
                      এখনই কিনুন
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Shopping Cart */}
          {tab === 'cart' && (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

              <h2>শপিং কার্ট</h2>

              {!cart.length ? (
                <p>
                  কার্ট খালি।
                  <button onClick={() => setTab('shop')}>
                    শপে যান
                  </button>
                </p>
              ) : (
                <div>

                  {cart.map(x => (
                    <div
                      key={x.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 10,
                        borderBottom: '1px solid #ddd'
                      }}
                    >
                      <span>
                        {x.name} ({money(x.price)} × {x.qty})
                      </span>

                      <div>
                        <button onClick={() => changeQty(x.id, -1)}>
                          -
                        </button>

                        {' '}{x.qty}{' '}

                        <button onClick={() => changeQty(x.id, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}

                  <h3>মোট: {money(cartTotal)}</h3>

                  <form
                    onSubmit={placeOrder}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      marginTop: 20
                    }}
                  >
                    <input
                      style={inputStyle}
                      required
                      placeholder="নাম"
                      value={checkout.name}
                      onChange={e =>
                        setCheckout({
                          ...checkout,
                          name: e.target.value
                        })
                      }
                    />

                    <input
                      style={inputStyle}
                      required
                      placeholder="ফোন"
                      value={checkout.phone}
                      onChange={e =>
                        setCheckout({
                          ...checkout,
                          phone: e.target.value
                        })
                      }
                    />

                    <textarea
                      style={inputStyle}
                      required
                      placeholder="ঠিকানা"
                      value={checkout.address}
                      onChange={e =>
                        setCheckout({
                          ...checkout,
                          address: e.target.value
                        })
                      }
                    />

                    <input
                      style={inputStyle}
                      required
                      placeholder="বিকাশ TrxID"
                      value={checkout.trxId}
                      onChange={e =>
                        setCheckout({
                          ...checkout,
                          trxId: e.target.value
                        })
                      }
                    />

                    <button
                      style={btn('#e11d48')}
                      disabled={busy}
                    >
                      অর্ডার কনফার্ম করুন
                    </button>
                  </form>

                </div>
              )}

            </div>
          )}

          {/* Admin Panel */}
          {tab === 'admin' && (
            <div>

              {!isAdmin ? (
                <div
                  style={{
                    maxWidth: 400,
                    margin: '40px auto',
                    ...panel,
                    textAlign: 'center'
                  }}
                >
                  <h2>অ্যাডমিন লগইন</h2>

                  <form
                    onSubmit={login}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      marginTop: 15
                    }}
                  >
                    <input
                      style={inputStyle}
                      type="email"
                      required
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />

                    <input
                      style={inputStyle}
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />

                    <button
                      style={btn()}
                      disabled={busy}
                    >
                      লগইন
                    </button>
                  </form>
                </div>
              ) : (
                <div>

                  <h2>অ্যাডমিন প্যানেল</h2>

                  {/* Dashboard Statistics */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 20
                    }}
                  >
                    <div
                      style={{
                        ...panel,
                        marginBottom: 0,
                        flex: '1 1 180px'
                      }}
                    >
                      <strong>মোট অর্ডার</strong>

                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800
                        }}
                      >
                        {orders.length}
                      </div>
                    </div>

                    <div
                      style={{
                        ...panel,
                        marginBottom: 0,
                        flex: '1 1 180px'
                      }}
                    >
                      <strong>মোট বিক্রয়</strong>

                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800
                        }}
                      >
                        {money(
                          orders.reduce(
                            (sum, o) =>
                              sum + Number(o.total || 0),
                            0
                          )
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        ...panel,
                        marginBottom: 0,
                        flex: '1 1 180px'
                      }}
                    >
                      <strong>মোট লাভ</strong>

                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800
                        }}
                      >
                        {money(
                          orders.reduce(
                            (sum, o) =>
                              sum + Number(o.profit || 0),
                            0
                          )
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        ...panel,
                        marginBottom: 0,
                        flex: '1 1 180px'
                      }}
                    >
                      <strong>পার্টনার</strong>

                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800
                        }}
                      >
                        {partners.length}
                      </div>
                    </div>
                  </div>

                  <button
                    style={btn('#ef4444')}
                    onClick={logout}
                  >
                    লগআউট
                  </button>

                  {/* Product Management */}
                  <div style={panel}>

                    <h3>নতুন পণ্য যোগ করুন</h3>

                    <form
                      onSubmit={saveProduct}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        marginTop: 10
                      }}
                    >

                      <input
                        style={inputStyle}
                        required
                        placeholder="নাম"
                        value={(editing || newProduct).name}
                        onChange={e =>
                          editing
                            ? setEditing({
                                ...editing,
                                name: e.target.value
                              })
                            : setNewProduct({
                                ...newProduct,
                                name: e.target.value
                              })
                        }
                      />

                      <input
                        style={inputStyle}
                        required
                        type="number"
                        placeholder="ক্রয়মূল্য"
                        value={(editing || newProduct).cost}
                        onChange={e =>
                          editing
                            ? setEditing({
                                ...editing,
                                cost: e.target.value
                              })
                            : setNewProduct({
                                ...newProduct,
                                cost: e.target.value
                              })
                        }
                      />

                      <input
                        style={inputStyle}
                        required
                        type="number"
                        placeholder="বিক্রয়মূল্য"
                        value={(editing || newProduct).price}
                        onChange={e =>
                          editing
                            ? setEditing({
                                ...editing,
                                price: e.target.value
                              })
                            : setNewProduct({
                                ...newProduct,
                                price: e.target.value
                              })
                        }
                      />

                      <input
                        style={inputStyle}
                        required
                        type="number"
                        placeholder="স্টক"
                        value={(editing || newProduct).stock}
                        onChange={e =>
                          editing
                            ? setEditing({
                                ...editing,
                                stock: e.target.value
                              })
                            : setNewProduct({
                                ...newProduct,
                                stock: e.target.value
                              })
                        }
                      />

                      <textarea
                        style={inputStyle}
                        placeholder="বিবরণ"
                        value={
                          (editing || newProduct).description || ''
                        }
                        onChange={e =>
                          editing
                            ? setEditing({
                                ...editing,
                                description: e.target.value
                              })
                            : setNewProduct({
                                ...newProduct,
                                description: e.target.value
                              })
                        }
                      />

                      <textarea
                        style={inputStyle}
                        placeholder="সুবিধা"
                        value={
                          (editing || newProduct).benefits || ''
                        }
                        onChange={e =>
                          editing
                            ? setEditing({
                                ...editing,
                                benefits: e.target.value
                              })
                            : setNewProduct({
                                ...newProduct,
                                benefits: e.target.value
                              })
                        }
                      />

                      <textarea
                        style={inputStyle}
                        placeholder="সতর্কতা"
                        value={
                          (editing || newProduct).drawbacks || ''
                        }
                        onChange={e =>
                          editing
                            ? setEditing({
                                ...editing,
                                drawbacks: e.target.value
                              })
                            : setNewProduct({
                                ...newProduct,
                                drawbacks: e.target.value
                              })
                        }
                      />

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={busy}
                        onChange={handleMultipleImagesUpload}
                      />

                      <button
                        style={btn()}
                        disabled={busy}
                      >
                        {editing ? 'আপডেট করুন' : 'যুক্ত করুন'}
                      </button>

                    </form>
                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          padding: 30,
          textAlign: 'center',
          marginTop: 50
        }}
      >
        <p>
          {settings.owner.address} | {settings.owner.phone}
        </p>

        <small>© Friends Bazaar</small>
      </footer>

    </div>
  );
}
