import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase';

const DEFAULT_SETTINGS = {
  owner: {
    name: 'Md. Anisur Rahman',
    email: 'anasurrahman5@gmail.com',
    phone: '01722023943',
    address: 'আশুগঞ্জ, ব্রাহ্মণবাড়িয়া, বাংলাদেশ',
    description: 'খাঁটি, নিরাপদ ও প্রিমিয়াম কোয়ালিটি পণ্য অর্ডার করুন খুব সহজেই ঘরে বসে।'
  },
  payment: { methodName: 'বিকাশ পার্সোনাল', accountNumber: '01722023943' },
  logo: '',
  banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  dashboardBg: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80'
};

const money = n => ৳ ${Number(n || 0).toLocaleString('en-BD')};
const inputStyle = { padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontSize: '15px' };
const btn = (bg='#0f172a') => ({ background:bg, color:'#fff', border:0, padding:'12px 18px', borderRadius:10, cursor:'pointer', fontWeight:700 });
const panel = { background:'#fff', padding:25, borderRadius:16, border:'1px solid #e2e8f0', marginBottom:25, boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' };

export default function App() {
  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 'shop';
    const h = window.location.hash.replace('#', '');
    return ['cart', 'admin', 'account'].includes(h) ? h : 'shop';
  });
  // অ্যাডমিন বাটন শুধু গোপন লিংক (আপনার-সাইট/#admin) দিয়ে ঢুকলে বা লগইন থাকলে দেখা যাবে
  const [adminLink] = useState(() => typeof window !== 'undefined' && window.location.hash === '#admin');
  const [session, setSession] = useState(null);
  const [adminRole, setAdminRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cart, setCart] = useState(() => {
    try { const s = localStorage.getItem('fb_cart'); return s ? JSON.parse(s) : []; } catch (e) { return []; }
  });
  const [checkout, setCheckout] = useState({ name:'', phone:'', email:'', address:'', paymentMethod:'Cash on Delivery', trxId:'' });
  const [lastOrder, setLastOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  
  // নতুন: সাইজ বা ভ্যারিয়েন্ট সিলেকশন স্টেট
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [newProduct, setNewProduct] = useState({ name: '', cost: '', price: '', stock: '', description: '', benefits: '', drawbacks: '', image_url: '', images: [], variants: [] });
  const [editing, setEditing] = useState(null);
  
  // নতুন: ভ্যারিয়েন্ট ইনপুট স্টেট
  const [newVariantInput, setNewVariantInput] = useState({ name: '', price: '', stock: '' });

  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [tempSettings, setTempSettings] = useState(DEFAULT_SETTINGS);

  const isAdmin = ['admin', 'owner'].includes(adminRole);

  // ---- নতুন: কাস্টমার অ্যাকাউন্ট ও কার্ট ----
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name:'', phone:'', email:'', password:'' });
  const [profileForm, setProfileForm] = useState({ name:'', phone:'', address:'' });
  const [customerCarts, setCustomerCarts] = useState([]);
  const [cartSyncedFor, setCartSyncedFor] = useState('');

  // পেজ বদলানো (ব্রাউজারের Back বাটন যেন সাইটের ভেতরেই কাজ করে)
  function goTab(next) {
    if (next === tab) return;
    window.history.pushState({ tab: next }, '', next === 'shop' ? window.location.pathname + window.location.search : '#' + next);
    setTab(next);
    window.scrollTo(0, 0);
  }
useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace('#', '');
      return ['cart', 'admin', 'account'].includes(h) ? h : 'shop';
    };
    window.history.replaceState({ tab: read() }, '');
    const onPop = () => { setTab(read()); setSelectedProduct(null); setIsZoomed(false); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const slimCart = list => list.map(x => ({ id: x.id, name: x.name, price: x.price, stock: x.stock, image_url: x.image_url, qty: x.qty, variant: x.variant }));

  // কার্ট ব্রাউজারে সেভ (রিফ্রেশ বা ব্রাউজার বন্ধ করলেও থাকবে)
  useEffect(() => {
    try { localStorage.setItem('fb_cart', JSON.stringify(slimCart(cart))); } catch (e) {}
  }, [cart]);

  // পণ্যের সর্বশেষ দাম ও স্টকের সাথে কার্ট মিলিয়ে নেওয়া
  useEffect(() => {
    if (!products.length) return;
    setCart(old => {
      const next = old.map(x => {
        const p = products.find(pp => String(pp.id) === String(x.id));
        if (!p) return null;
        let availableStock = p.stock;
        if (x.variant && p.variants?.length) {
          const vObj = p.variants.find(v => v.name === x.variant);
          if (vObj) availableStock = vObj.stock;
        }
        const qty = Math.min(Number(x.qty), Number(availableStock));
        return qty > 0 ? { ...p, price: x.price, qty } : null;
      }).filter(Boolean);
      return JSON.stringify(slimCart(next)) === JSON.stringify(slimCart(old)) ? old : next;
    });
  }, [products, cart.length]);

  // লগইন করা কাস্টমারের সার্ভারে রাখা কার্ট ফিরিয়ে আনা
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || isAdmin) { setCartSyncedFor(''); return; }
    let active = true;
    (async () => {
      const { data } = await supabase.from('customer_carts').select('items').eq('user_id', uid).maybeSingle();
      if (!active) return;
      const saved = Array.isArray(data?.items) ? data.items : [];
      if (saved.length) {
        setCart(old => old.length ? old : saved.map(i => ({ id: i.product_id, name: i.name, price: i.price, stock: 9999, qty: i.qty, variant: i.variant })));
      }
      setCartSyncedFor(uid);
    })();
    return () => { active = false; };
  }, [session?.user?.id, isAdmin]);

  // লগইন করা কাস্টমারের কার্ট সার্ভারে সেভ (অ্যাডমিন দেখতে পারবে)
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid  isAdmin  cartSyncedFor !== uid) return;
    const timer = setTimeout(async () => {
      if (!cart.length) { await supabase.from('customer_carts').delete().eq('user_id', uid); return; }
      const m = session.user.user_metadata || {};
      await supabase.from('customer_carts').upsert({
        user_id: uid,
        email: session.user.email,
        full_name: m.full_name || '',
        phone: m.phone || '',
        items: cart.map(x => ({ product_id: x.id, name: x.name, price: Number(x.price), qty: x.qty, variant: x.variant || '' })),
        total: cart.reduce((sum, x) => sum + Number(x.price) * x.qty, 0),
        updated_at: new Date().toISOString()
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [cart, session, isAdmin, cartSyncedFor]);

  function accountDefaults() {
    const u = session?.user;
    const m = u?.user_metadata || {};
    return { name: m.full_name  '', phone: m.phone  '', email: u?.email  '', address: m.address  '' };
  }

  // লগইন থাকলে চেকআউট ফর্মে নাম/ফোন/ইমেইল/ঠিকানা আগে থেকে বসানো
  useEffect(() => {
    if (!session?.user) return;
    const d = accountDefaults();
    setCheckout(c => ({ ...c, name: c.name  d.name, phone: c.phone  d.phone, email: c.email  d.email, address: c.address  d.address }));
    setProfileForm({ name: d.name, phone: d.phone, address: d.address });
  }, [session?.user?.id]);
async function loadCarts() {
    const { data, error } = await supabase.from('customer_carts').select('*').order('updated_at', { ascending: false });
    if (!error) setCustomerCarts((data || []).filter(c => Array.isArray(c.items) && c.items.length));
  }
  useEffect(() => { if (isAdmin) loadCarts(); }, [isAdmin]);

  async function customerRegister(e) {
    e.preventDefault();
    if (authForm.phone.length !== 11) return setNotice('মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে।');
    if (authForm.password.length < 6) return setNotice('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: authForm.email.trim(),
      password: authForm.password,
      options: { data: { full_name: authForm.name.trim(), phone: authForm.phone.trim() } }
    });
    setBusy(false);
    if (error) return setNotice('অ্যাকাউন্ট খোলা যায়নি: ' + error.message);
    setAuthForm({ name:'', phone:'', email:'', password:'' });
    if (data.session) setNotice('🎉 অ্যাকাউন্ট তৈরি হয়েছে, আপনি লগইন অবস্থায় আছেন।');
    else setNotice('অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলে পাঠানো লিংকে ক্লিক করে ভেরিফাই করে তারপর লগইন করুন।');
  }

  async function customerLogin(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password });
    setBusy(false);
    if (error) setNotice('লগইন হয়নি: ' + error.message);
    else { setAuthForm({ name:'', phone:'', email:'', password:'' }); setNotice('লগইন সফল হয়েছে।'); }
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (profileForm.phone && profileForm.phone.length !== 11) return setNotice('মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে।');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: profileForm.name.trim(), phone: profileForm.phone.trim(), address: profileForm.address.trim() } });
    setBusy(false);
    setNotice(error ? 'সেভ হয়নি: ' + error.message : 'আপনার তথ্য সংরক্ষিত হয়েছে।');
  }


  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadAll() {
    if (!isConfigured) return;
    const [p, s] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending:false }),
      supabase.from('site_settings').select('value').eq('id', 1).maybeSingle()
    ]);
    if (p.error) setNotice(p.error.message);
    else setProducts(p.data || []);
    
    const nextSettings = s.data?.value || DEFAULT_SETTINGS;
    const mergedSettings = { 
      ...DEFAULT_SETTINGS, 
      ...nextSettings,
      owner: { ...DEFAULT_SETTINGS.owner, ...(nextSettings.owner || {}) },
      payment: { ...DEFAULT_SETTINGS.payment, ...(nextSettings.payment || {}) }
    };
    setSettings(mergedSettings);
    setTempSettings(mergedSettings);

    if (session) {
      const o = await supabase.from('orders').select('*, order_items(*, products(*))').order('created_at', { ascending:false });
      if (!o.error) setOrders(o.data || []);
      const pt = await supabase.from('partners').select('*').order('created_at');
      if (!pt.error) setPartners(pt.data || []);
    }
  }

  useEffect(() => {
    let active = true;
    async function checkRole() {
      if (!session?.user?.id) { setAdminRole(''); return; }
      const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (active) setAdminRole(error ? '' : (data?.role || ''));
    }
    checkRole();
    return () => { active = false; };
  }, [session]);

  useEffect(() => { loadAll(); }, [session]);
const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0), [cart]);
  
  const validOrders = useMemo(() => orders.filter(o => o.status !== 'Cancelled'), [orders]);
  const revenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalProfit = validOrders.reduce((sum, o) => sum + Number(o.profit || 0), 0);

  const analytics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let dailyP = 0, weeklyP = 0, monthlyP = 0, yearlyP = 0;
    let monthlyS = 0, yearlyS = 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    validOrders.forEach(o => {
      const oDate = new Date(o.created_at);
      const p = Number(o.profit || 0);
      const t = Number(o.total || 0);

      if (oDate.toDateString() === todayStr) dailyP += p;
      if (oDate >= oneWeekAgo) weeklyP += p;
      if (oDate.getMonth() === currentMonth && oDate.getFullYear() === currentYear) {
        monthlyP += p;
        monthlyS += t;
      }
      if (oDate.getFullYear() === currentYear) {
        yearlyP += p;
        yearlyS += t;
      }
    });

    return { dailyP, weeklyP, monthlyP, yearlyP, monthlyS, yearlyS };
  }, [validOrders]);

  async function login(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setNotice('লগইন হয়নি: ' + error.message);
    else { setPassword(''); setNotice('লগইন সফল হয়েছে।'); }
  }

  async function logout() {
    await supabase.auth.signOut();
    setOrders([]); setPartners([]); setAdminRole(''); goTab('shop');
  }

  function addToCart(p, customVariant = null) {
    let priceToUse = p.price;
    let variantName = '';
    let stockToCheck = p.stock;

    if (p.variants && p.variants.length > 0) {
      const v = customVariant  selectedVariant  p.variants[0];
      priceToUse = Number(v.price);
      variantName = v.name;
      stockToCheck = Number(v.stock);
    }

    if (stockToCheck < 1) return setNotice('দুঃখিত, এই সাইজ বা পণ্যটি বর্তমানে স্টকে নেই।');
    
    const found = cart.find(x => x.id === p.id && x.variant === variantName);
    if (found && found.qty >= stockToCheck) return setNotice('স্টকের অতিরিক্ত পণ্য কার্টে যোগ করা যাবে না।');
    
    const newItem = { 
      ...p, 
      price: priceToUse, 
      variant: variantName, 
      stock: stockToCheck, 
      qty: 1 
    };

    setCart(old => found ? old.map(x => (x.id === p.id && x.variant === variantName) ? {...x, qty: x.qty + 1} : x) : [...old, newItem]);
    setNotice(কার্টে যোগ করা হয়েছে: ${p.name} ${variantName ? '('+variantName+')' : ''});
  }

  function changeQty(id, variant, delta) {
    setCart(old => old.map(x => (x.id === id && x.variant === variant) ? {...x, qty: Math.max(0, Math.min(Number(x.stock), x.qty + delta))} : x).filter(x => x.qty > 0));
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!cart.length) return;

    if (checkout.phone.length !== 11) {
      return setNotice('মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে।');
    }

    if (checkout.paymentMethod === 'bKash' && !checkout.trxId.trim()) {
      return setNotice('বিকাশ পেমেন্টের জন্য ট্রানজেকশন আইডি (TrxID) দেওয়া বাধ্যতামূলক।');
    }

    setBusy(true);
    const items = cart.map(x => ({ 
      product_id: String(x.id), 
      qty: x.qty, 
      price: x.price,
      variant: x.variant || '' 
    }));
    
    const { data, error } = await supabase.rpc('create_public_order', {
      p_customer_name: checkout.name.trim(),
      p_phone: checkout.phone.trim(),
      p_email: checkout.email.trim() || null,
      p_address: checkout.address.trim(),
p_payment_method: checkout.paymentMethod,
      p_trx_id: checkout.paymentMethod === 'bKash' ? checkout.trxId.trim() : 'Cash on Delivery',
      p_items: items
    });
    
    setBusy(false);
    if (error) { 
      setNotice('অর্ডার সাবমিট হয়নি: ' + error.message); 
      return; 
    }
    
    if (data?.order_id) {
      setLastOrder({
        order_code: data.order_code,
        created_at: data.created_at,
        customer_name: checkout.name,
        phone: checkout.phone,
        address: checkout.address,
        trx_id: checkout.paymentMethod === 'bKash' ? checkout.trxId : 'Cash on Delivery',
        status: 'Pending',
        total: data.total,
        order_items: (data.items || []).map(i => ({ qty: i.qty, price: i.price, variant: i.variant, products: { name: i.name } }))
      });
    }

    setCart([]); 
    setCheckout({ ...accountDefaults(), paymentMethod:'Cash on Delivery', trxId:'' });
    await loadAll();
    setNotice('🎉 আপনার অর্ডারটি সফলভাবে কনফার্ম হয়েছে!');
  }

  async function uploadImage(file, path) {
    if (!file) return '';
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = ${path}/${Date.now()}-${crypto.randomUUID()}.${ext};
    const { error } = await supabase.storage.from('site-assets').upload(key, file);
    if (error) throw error;
    return supabase.storage.from('site-assets').getPublicUrl(key).data.publicUrl;
  }

  async function handleMultipleImagesUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setBusy(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const url = await uploadImage(file, 'products');
        if (url) uploadedUrls.push(url);
      }
      const target = editing || newProduct;
      const combinedImages = [...(target.images || []), ...uploadedUrls];
      if (editing) setEditing({ ...editing, images: combinedImages, image_url: target.image_url || combinedImages[0] });
      else setNewProduct({ ...newProduct, images: combinedImages, image_url: combinedImages[0] });
      setNotice('ছবি সফলভাবে আপলোড হয়েছে!');
    } catch (err) { setNotice(err.message); }
    setBusy(false);
  }

  // ১. ছবি ডিলিট করার ফাংশন
  function removeImage(indexToRemove) {
    const target = editing || newProduct;
    const nextImages = target.images.filter((_, idx) => idx !== indexToRemove);
    const nextCover = nextImages[0] || '';
    if (editing) setEditing({ ...editing, images: nextImages, image_url: nextCover });
    else setNewProduct({ ...newProduct, images: nextImages, image_url: nextCover });
  }

  // ১. ছবির পজিশন বদলানোর ফাংশন (তীর চিহ্ন দিয়ে মুভ)
  function moveImage(fromIndex, direction) {
    const target = editing || newProduct;
    const imgs = [...(target.images || [])];
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= imgs.length) return;
    const temp = imgs[fromIndex];
    imgs[fromIndex] = imgs[toIndex];
    imgs[toIndex] = temp;
    const nextCover = imgs[0] || '';
    if (editing) setEditing({ ...editing, images: imgs, image_url: nextCover });
    else setNewProduct({ ...newProduct, images: imgs, image_url: nextCover });
  }

  // ৩. ভ্যারিয়েন্ট বা সাইজ অ্যাড করা
  function addVariant() {
    if (!newVariantInput.name || !newVariantInput.price) return setNotice('ভ্যারিয়েন্টের নাম ও দাম দিন।');
    const target = editing || newProduct;
    const nextVariants = [...(target.variants || []), { 
      name: newVariantInput.name.trim(), 
      price: Number(newVariantInput.price), 
      stock: Number(newVariantInput.stock || 0) 
    }];
    if (editing) setEditing({ ...editing, variants: nextVariants });
    else setNewProduct({ ...newProduct, variants: nextVariants });
    setNewVariantInput({ name: '', price: '', stock: '' });
  }
function removeVariant(index) {
    const target = editing || newProduct;
    const nextVariants = target.variants.filter((_, idx) => idx !== index);
    if (editing) setEditing({ ...editing, variants: nextVariants });
    else setNewProduct({ ...newProduct, variants: nextVariants });
  }

  async function saveProduct(e) {
    e.preventDefault(); setBusy(true);
    try {
      const source = editing || newProduct;
      const allImages = source.images?.length ? source.images : (source.image_url ? [source.image_url] : []);
      const row = { 
        name: source.name.trim(), 
        cost: Number(source.cost || 0), 
        price: Number(source.price || 0), 
        stock: Number(source.stock || 0), 
        description: source.description || '',
        benefits: source.benefits || '',
        drawbacks: source.drawbacks || '',
        image_url: allImages[0] || null, 
        images: allImages,
        variants: source.variants || []
      };
      const result = editing ? await supabase.from('products').update(row).eq('id', editing.id) : await supabase.from('products').insert(row);
      if (result.error) throw result.error;
      setEditing(null); 
      setNewProduct({name:'', cost:'', price:'', stock:'', description:'', benefits:'', drawbacks:'', image_url:'', images:[], variants:[]});
      await loadAll(); 
      setNotice('পণ্য সফলভাবে সংরক্ষিত হয়েছে।');
    } catch(err) { setNotice(err.message); }
    setBusy(false);
  }

  async function deleteProduct(id) {
    if (!confirm('পণ্যটি কি মুছে ফেলতে চান?')) return;
    await supabase.from('products').delete().eq('id', id);
    await loadAll();
  }

  async function saveSettings(e) {
    e.preventDefault(); setBusy(true);
    try {
      const formElements = e.currentTarget.elements;
      let next = { ...tempSettings };
      
      const logoFile = formElements.logoInput?.files?.[0];
      const bannerFile = formElements.bannerInput?.files?.[0];
      const bgFile = formElements.bgInput?.files?.[0];

      if (logoFile) next.logo = await uploadImage(logoFile, 'branding');
      if (bannerFile) next.banner = await uploadImage(bannerFile, 'branding');
      if (bgFile) next.dashboardBg = await uploadImage(bgFile, 'branding');

      const { error } = await supabase.from('site_settings').upsert({ id: 1, value: next });
      if (error) throw error;

      setSettings(next);
      setTempSettings(next);
      setNotice('ওয়েবসাইট সেটিংস সফলভাবে আপডেট করা হয়েছে!');
    } catch(err) { setNotice(err.message); }
    setBusy(false);
  }

  async function updateOrderStatus(orderId, status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) { setNotice('স্ট্যাটাস আপডেট হয়নি: ' + error.message); return; }

    await loadAll();
    let msg = status === 'Cancelled' ? 'অর্ডার বাতিল হয়েছে, পণ্য স্টকে ফেরত গেছে।' : 'অর্ডারের স্ট্যাটাস আপডেট হয়েছে।';

    if (['Completed', 'Cancelled'].includes(status)) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('notify-order', { body: { order_id: orderId } });
        if (fnError) throw fnError;
        if (data?.sent?.length) msg += ' কাস্টমারকে মেসেজ পাঠানো হয়েছে (' + data.sent.join(', ') + ')।';
      } catch (err) {}
    }
    setNotice(msg);
  }

  async function deleteOrder(order) {
    if (!confirm(অর্ডার ${order.order_code} স্থায়ীভাবে ডিলিট করতে চান? এটা আর ফেরানো যাবে না।)) return;
    const { error } = await supabase.rpc('delete_order', { p_order_id: String(order.id) });
    if (error) setNotice('ডিলিট হয়নি: ' + error.message);
    else { await loadAll(); setNotice('অর্ডার ডিলিট করা হয়েছে।'); }
  }

  async function addPartner(e) {
    e.preventDefault();
    if (!newPartnerEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('partners').insert({ name: 'Partner', email: newPartnerEmail.trim() });
setBusy(false);
    if (error) {
      setNotice('পার্টনার যোগ করা যায়নি: ' + error.message);
    } else {
      setNewPartnerEmail('');
      setNotice('পার্টনার সফলভাবে যুক্ত করা হয়েছে!');
      await loadAll();
    }
  }

  async function deletePartner(id) {
    if (!confirm('পার্টনারকে তালিকা থেকে সরাতে চান?')) return;
    await supabase.from('partners').delete().eq('id', id);
    await loadAll();
  }

  async function changeOrderItemQty(item, delta) {
    const next = Number(item.qty) + delta;
    if (next < 1) return setNotice('কমপক্ষে ১ পিস থাকতে হবে। পুরো অর্ডার বাদ দিতে ক্যান্সেল করুন।');
    const { error } = await supabase.rpc('update_order_item_qty', { p_item_id: String(item.id), p_new_qty: next });
    if (error) setNotice('পরিমাণ আপডেট হয়নি: ' + error.message);
    else { await loadAll(); setNotice('অর্ডারের পরিমাণ আপডেট হয়েছে।'); }
  }

  function downloadInvoice(order) {
    const printWindow = window.open('', '_blank');
    const htmlContent = 
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${order.order_code}</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; padding: 30px; color: #1e293b; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); border-radius: 10px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th, .table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
          .table th { background: #f1f5f9; }
          .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #059669; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div style="display:flex; align-items:center; gap:12px;">
                ${settings.logo ? <img src="${settings.logo}" alt="Logo" style="height:50px; width:50px; border-radius:50%; object-fit:cover;" /> : ''}
                <h2 style="margin:0; color:#0f172a;">Friends Bazaar</h2>
              </div>
              <p style="margin:8px 0 0 0; font-size:13px; color:#64748b;">${settings.owner.address} | ফোন: ${settings.owner.phone}</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin:0; color:#0284c7;">INVOICE</h3>
              <p style="margin:5px 0 0 0; font-size:14px;">কোড: <b>${order.order_code}</b></p>
              <p style="margin:3px 0 0 0; font-size:13px; color:#64748b;">তারিখ: ${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="margin:4px 0;"><b>গ্রাহকের নাম:</b> ${order.customer_name}</p>
            <p style="margin:4px 0;"><b>ফোন নম্বর:</b> ${order.phone}</p>
            <p style="margin:4px 0;"><b>ঠিকানা:</b> ${order.address}</p>
            <p style="margin:4px 0;"><b>পেমেন্ট মাধ্যম:</b> ${order.trx_id === 'Cash on Delivery' ? 'ক্যাশ অন ডেলিভারি' : 'বিকাশ'}</p>
            ${order.trx_id !== 'Cash on Delivery' ? <p style="margin:4px 0;"><b>বিকাশ TrxID:</b> ${order.trx_id}</p>` : ''}
            <p style="margin:4px 0;"><b>অর্ডার স্ট্যাটাস:</b> <span style="color:${order.status==='Cancelled'?'#dc2626':'#059669'}">${order.status}</span></p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>পণ্যের নাম ও সাইজ</th>
                <th>পরিমাণ</th>
                <th>মূল্য</th>
                <th>মোট</th>
[11/18/2026 10:32 PM] Al Habibi: </tr>
            </thead>
            <tbody>
              ${order.order_items.map(item => 
                <tr>
                  <td>${item.product_name || item.products?.name || 'পণ্য'} ${item.variant ? '('+item.variant+')' : ''}</td>
                  <td>${item.qty} টি</td>
                  <td>৳ ${Number(item.price).toLocaleString('en-BD')}</td>
                  <td>৳ ${(item.price * item.qty).toLocaleString('en-BD')}</td>
                </tr>
              ).join('')}
            </tbody>
          </table>

          <div class="total">
            মোট প্রদেয়: ৳ ${Number(order.total).toLocaleString('en-BD')}
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            আমাদের সাথে থাকার জন্য ধন্যবাদ! — Friends Bazaar
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    ;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  return (
    <div style={{fontFamily:"Inter,Arial,sans-serif",background:'#f8fafc',minHeight:'100vh',color:'#1e293b',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
      <div>
        <nav style={{background:'#0f172a',color:'#fff',padding:'15px 30px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
          <div onClick={()=>goTab('shop')} style={{cursor:'pointer',fontSize:24,fontWeight:900,color:'#38bdf8',display:'flex',alignItems:'center',gap:10}}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{height:35,width:35,borderRadius:'50%',objectFit:'cover'}}/>}
            Friends Bazaar
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <button style={btn(tab==='shop'?'#38bdf8':'#334155')} onClick={()=>goTab('shop')}>🛍️ শপ</button>
            <button style={btn(tab==='cart'?'#38bdf8':'#334155')} onClick={()=>goTab('cart')}>🛒 কার্ট ({cart.reduce((a,b)=>a+b.qty,0)})</button>
            <button style={btn(tab==='account'?'#38bdf8':'#334155')} onClick={()=>goTab('account')}>{session ? '👤 অ্যাকাউন্ট' : '👤 লগইন'}</button>
            {(isAdmin || adminLink) && (
              <button style={btn(tab==='admin'?'#e11d48':'#334155')} onClick={()=>goTab('admin')}>⚙️ অ্যাডমিন</button>
            )}
          </div>
        </nav>

        {notice && <div onClick={()=>setNotice('')} style={{background:'#38bdf8',color:'#0f172a',padding:12,textAlign:'center',cursor:'pointer',fontWeight:600}}>{notice} ✕</div>}
        
        <main style={{maxWidth:1200,margin:'30px auto',padding:'0 20px'}}>
          {tab==='shop' && (
            <div>
              <section style={{backgroundImage:linear-gradient(#0f172acc,#1e293bcc),url("${settings.banner}")`,backgroundSize:'cover',backgroundPosition:'center',padding:'80px 20px',borderRadius:20,textAlign:'center',color:'#fff',marginBottom:40,boxShadow:'0 10px 25px rgba(0,0,0,0.1)'}}>
                <h1 style={{fontSize:42,color:'#38bdf8',marginBottom:15}}>স্বাগতম Friends Bazaar-এ</h1>
                <p style={{fontSize:18,maxWidth:700,margin:'0 auto',lineHeight:1.6}}>{settings.owner.description}</p>
              </section>
              
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:25}}>
                {products.map(p=>(
                  <div key={p.id} style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.04)',display:'flex',flexDirection:'column',border:'1px solid #e2e8f0',transition:'transform 0.2s'}}>
                    <div onClick={()=>{
setSelectedProduct(p); 
                      setActiveImageIndex(0); 
                      setSelectedVariant(p.variants && p.variants.length > 0 ? p.variants[0] : null);
                    }} style={{cursor:'pointer',height:220,background:'#f1f5f9',position:'relative'}}>
                      <img src={p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      <span style={{position:'absolute',top:12,right:12,background:p.stock>0?'#059669':'#dc2626',color:'#fff',padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>
                        {p.stock>0 ? স্টক: ${p.stock} : 'স্টক আউট'}
                      </span>
                    </div>
                    <div style={{padding:20,flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                      <div>
                        <h3 onClick={()=>{ 
                          setSelectedProduct(p); 
                          setActiveImageIndex(0); 
                          setSelectedVariant(p.variants && p.variants.length > 0 ? p.variants[0] : null);
                        }} style={{cursor:'pointer',fontSize:18,marginBottom:8,color:'#0f172a'}}>{p.name}</h3>
                        <strong style={{color:'#059669',fontSize:22}}>
                          {p.variants && p.variants.length > 0 ? শুরুতে ${money(p.variants[0].price)} : money(p.price)}
                        </strong>
                      </div>
                      <div style={{display:'flex',gap:10,marginTop:20}}>
                        <button style={{...btn('#0284c7'),flex:1}} onClick={()=>{
                          setSelectedProduct(p); 
                          setActiveImageIndex(0); 
                          setSelectedVariant(p.variants && p.variants.length > 0 ? p.variants[0] : null);
                        }}>বিস্তারিত ও সাইজ</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedProduct && (
                <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:3000,padding:20}}>
                  <div style={{background:'#fff',padding:30,borderRadius:20,maxWidth:750,width:'100%',maxHeight:'90vh',overflowY:'auto',position:'relative'}}>
                    <button onClick={()=>setSelectedProduct(null)} style={{position:'absolute',top:15,right:15,background:'#ef4444',color:'#fff',border:0,borderRadius:'50%',width:32,height:32,cursor:'pointer',fontWeight:700}}>✕</button>
                    <h2 style={{fontSize:24,marginBottom:5}}>{selectedProduct.name}</h2>
                    
                    {/* ডাইনামিক প্রাইস শো */}
                    <strong style={{color:'#059669',fontSize:26}}>
                      {selectedVariant ? money(selectedVariant.price) : money(selectedProduct.price)}
                    </strong>
                    
                    <p style={{fontSize:14,color: (selectedVariant ? selectedVariant.stock : selectedProduct.stock) > 0 ? '#059669' : '#dc2626',fontWeight:600,marginTop:5}}>
                      {(selectedVariant ? selectedVariant.stock : selectedProduct.stock) > 0 ? উপলব্ধ স্টক: ${selectedVariant ? selectedVariant.stock : selectedProduct.stock} টি : 'এই সাইজটি স্টকে নেই'}
                    </p>

                    {/* ৩. সাইজ বা ভ্যারিয়েন্ট সিলেকশন বাটন */}
                    {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                      <div style={{marginTop:15,background:'#f1f5f9',padding:15,borderRadius:12}}>
                        <label style={{display:'block',marginBottom:8,fontWeight:700,color:'#0f172a'}}>📏 সাইজ / ওজন সিলেক্ট করুন:</label>
<div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                          {selectedProduct.variants.map((v, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedVariant(v)}
                              style={{
                                padding:'8px 16px',
                                borderRadius:8,
                                border: selectedVariant?.name === v.name ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                background: selectedVariant?.name === v.name ? '#e0f2fe' : '#fff',
                                color: selectedVariant?.name === v.name ? '#0369a1' : '#1e293b',
                                fontWeight:700,
                                cursor:'pointer'
                              }}
                            >
                              {v.name} ({money(v.price)})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{textAlign:'center',margin:'20px 0',position:'relative'}}>
                      <img 
                        src={(selectedProduct.images && selectedProduct.images[activeImageIndex]) || selectedProduct.image_url} 
                        alt="" 
                        onClick={()=>setIsZoomed(true)} 
                        style={{maxHeight:280,width:'100%',objectFit:'contain',borderRadius:10,cursor:'zoom-in',border:'1px solid #e2e8f0'}}
                        title="ফটো জুম করতে ক্লিক করুন"
                      />
                      <p style={{fontSize:12,color:'#64748b',marginTop:5}}>বড় করে দেখতে ছবিতে ক্লিক করুন</p>
                      
                      {selectedProduct.images?.length > 1 && (
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12,overflowX:'auto',paddingBottom:5}}>
                          {selectedProduct.images.map((img, idx)=>(
                            <img key={idx} src={img} alt="" onClick={()=>setActiveImageIndex(idx)} style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:activeImageIndex===idx?'2px solid #0284c7':'2px solid #cbd5e1',cursor:'pointer'}}/>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ২. আই-ক্যাচি ডেসক্রিপশন রেন্ডারিং (white-space pre-line সহ) */}
                    <div style={{display:'flex',flexDirection:'column',gap:12,background:'#f8fafc',padding:15,borderRadius:12,marginTop:15,lineHeight:1.6}}>
                      <div>
                        <b style={{color:'#0f172a',display:'block',marginBottom:4}}>পণ্যের বিবরণ:</b>
                        <div style={{whiteSpace:'pre-line',color:'#334155'}}>{selectedProduct.description || 'বিবরণ দেওয়া হয়নি।'}</div>
                      </div>
                      {selectedProduct.benefits && (
                        <div>
                          <b style={{color:'#059669',display:'block',marginBottom:4}}>উপকারিতা:</b>
                          <div style={{whiteSpace:'pre-line',color:'#334155'}}>{selectedProduct.benefits}</div>
                        </div>
                      )}
                      {selectedProduct.drawbacks && (
                        <div>
                          <b style={{color:'#d97706',display:'block',marginBottom:4}}>সতর্কতা / বিশেষ দ্রষ্টব্য:</b>
                          <div style={{whiteSpace:'pre-line',color:'#334155'}}>{selectedProduct.drawbacks}</div>
                        </div>
                      )}
                    </div>

                    <button style={{...btn('#059669'),width:'100%',marginTop:20,padding:14,fontSize:16}} disabled={(selectedVariant ? selectedVariant.stock : selectedProduct.stock) < 1} onClick={()=>{
addToCart(selectedProduct, selectedVariant);
                      setSelectedProduct(null);
                      goTab('cart');
                    }}>
                      🛒 এখনই কিনুন (Buy Now)
                    </button>
                  </div>
                </div>
              )}

              {/* ইমেজ জুম মোড */}
              {isZoomed && selectedProduct && (
                <div onClick={()=>setIsZoomed(false)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.9)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:4000,cursor:'zoom-out'}}>
                  <img src={(selectedProduct.images && selectedProduct.images[activeImageIndex]) || selectedProduct.image_url} alt="" style={{maxWidth:'95vw',maxHeight:'95vh',objectFit:'contain'}}/>
                </div>
              )}
            </div>
          )}

          {tab==='cart' && (
            <div style={{maxWidth:800,margin:'0 auto',...panel}}>
              <h2>🛒 শপিং কার্ট ও চেকআউট</h2>
              {lastOrder ? (
                <div style={{background:'#d1fae5',color:'#065f46',padding:20,borderRadius:12,marginBottom:20,border:'1px solid #34d399'}}>
                  <h3 style={{margin:'0 0 5px 0'}}>🎉 ধন্যবাদ! আপনার অর্ডারটি সফলভাবে কনফার্ম হয়েছে!</h3>
                  <p style={{margin:'0 0 15px 0'}}>অর্ডার আইডি: <b>{lastOrder.order_code}</b></p>
                  <button style={btn('#0284c7')} onClick={()=>downloadInvoice(lastOrder)}>📥 অর্ডার ইনভয়েস ডাউনলোড/প্রিন্ট করুন</button>
                </div>
              ) : null}

              {!cart.length ? (
                <div style={{textAlign:'center',padding:'40px 0'}}>
                  <p style={{fontSize:18,color:'#64748b'}}>আপনার কার্ট খালি রয়েছে।</p>
                  <button style={{...btn('#0284c7'),marginTop:10}} onClick={()=>goTab('shop')}>শপে ফিরে যান</button>
                </div>
              ) : (
                <div>
                  <div style={{marginBottom:20}}>
                    {cart.map((x, idx)=>(
                      <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #e2e8f0'}}>
                        <div>
                          <h4 style={{margin:0}}>{x.name} {x.variant ? (${x.variant}) : ''}</h4>
                          <span style={{fontSize:14,color:'#64748b'}}>{money(x.price)} × {x.qty}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <strong>{money(x.price * x.qty)}</strong>
                          <div style={{display:'flex',gap:5,alignItems:'center'}}>
                            <button onClick={()=>changeQty(x.id, x.variant, -1)} style={{padding:'4px 10px',background:'#cbd5e1',border:0,borderRadius:6,cursor:'pointer',fontWeight:700}}>-</button>
                            <span>{x.qty}</span>
                            <button onClick={()=>changeQty(x.id, x.variant, 1)} style={{padding:'4px 10px',background:'#cbd5e1',border:0,borderRadius:6,cursor:'pointer',fontWeight:700}}>+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:20,fontWeight:700,marginTop:20}}>
                      <span>মোট প্রদেয়:</span>
                      <span style={{color:'#059669'}}>{money(cartTotal)}</span>
                    </div>
                  </div>

                  {/* পেমেন্ট পদ্ধতি সিলেকশন */}
                  <div style={{background:'#f1f5f9',padding:20,borderRadius:12,marginBottom:20}}>
                    <h4 style={{margin:'0 0 10px 0',color:'#0f172a'}}>পেমেন্ট মাধ্যম সিলেক্ট করুন:</h4>
<div style={{display:'flex',gap:20,marginBottom:15}}>
                      <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontWeight:600}}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={checkout.paymentMethod === 'Cash on Delivery'} 
                          onChange={()=>setCheckout({...checkout, paymentMethod: 'Cash on Delivery'})}
                        /> ক্যাশ অন ডেলিভারি (Cash on Delivery)
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontWeight:600}}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={checkout.paymentMethod === 'bKash'} 
                          onChange={()=>setCheckout({...checkout, paymentMethod: 'bKash'})}
                        /> বিকাশ পেমেন্ট (bKash)
                      </label>
                    </div>

                    {checkout.paymentMethod === 'bKash' && (
                      <div style={{background:'#fff',padding:15,borderRadius:8,border:'1px solid #cbd5e1'}}>
                        <p style={{margin:'0 0 5px 0'}}>প্রথমে নিচের নম্বরে সেন্ড মানি করুন:</p>
                        <p style={{margin:0,fontSize:16}}><b>{settings.payment.methodName}:</b> <span style={{color:'#0284c7',fontWeight:700}}>{settings.payment.accountNumber}</span></p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={placeOrder} style={{display:'flex',flexDirection:'column',gap:15}}>
                    <input style={inputStyle} required placeholder="আপনার পূর্ণ নাম" value={checkout.name} onChange={e=>setCheckout({...checkout,name:e.target.value})}/>
                    
                    {/* ফোন নম্বর (১১ ডিজিট নিশ্চিতকরণ) */}
                    <input 
                      style={inputStyle} 
                      required 
                      type="tel"
                      maxLength={11}
                      placeholder="মোবাইল নম্বর (যেমন: 017xxxxxxxx)" 
                      value={checkout.phone} 
                      onChange={e=>{
                        const val = e.target.value.replace(/\D/g, '');
                        if(val.length <= 11) setCheckout({...checkout, phone: val});
                      }}
                    />
                    
                    <input style={inputStyle} type="email" placeholder="ইমেইল (ঐচ্ছিক — অর্ডারের আপডেট ইমেইলে পেতে)" value={checkout.email} onChange={e=>setCheckout({...checkout,email:e.target.value})}/>

                    <textarea style={{...inputStyle,height:80}} required placeholder="পূর্ণাঙ্গ ঠিকানা (বাসা, রোড, থানা, জেলা)" value={checkout.address} onChange={e=>setCheckout({...checkout,address:e.target.value})}/>
                    
                    {/* বিকাশ সিলেক্ট করলে ট্রানজেকশন আইডি ফিল্ড দেখাবে */}
                    {checkout.paymentMethod === 'bKash' && (
                      <input style={inputStyle} required placeholder="বিকাশ TrxID (লেনদেন আইডি)" value={checkout.trxId} onChange={e=>setCheckout({...checkout,trxId:e.target.value})}/>
                    )}

                    <button style={btn('#e11d48')} disabled={busy}>অর্ডার কনফার্ম করুন</button>
                  </form>
                </div>
              )}
            </div>
          )}

          {tab==='account' && (
            <div style={{maxWidth:800,margin:'0 auto'}}>
              {!session ? (
                <div style={{maxWidth:440,margin:'20px auto',...panel}}>
                  <div style={{display:'flex',gap:10,marginBottom:20}}>
                    <button type="button" onClick={()=>setAuthMode('login')} style={{...btn(authMode==='login'?'#0284c7':'#94a3b8'),flex:1}}>লগইন</button>
<button type="button" onClick={()=>setAuthMode('register')} style={{...btn(authMode==='register'?'#0284c7':'#94a3b8'),flex:1}}>নতুন অ্যাকাউন্ট</button>
                  </div>
                  {authMode==='login' ? (
                    <form onSubmit={customerLogin} style={{display:'flex',flexDirection:'column',gap:15}}>
                      <h2 style={{margin:0}}>👤 কাস্টমার লগইন</h2>
                      <input style={inputStyle} type="email" required placeholder="ইমেইল অ্যাড্রেস" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})}/>
                      <input style={inputStyle} type="password" required placeholder="পাসওয়ার্ড" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})}/>
                      <button style={btn('#059669')} disabled={busy}>লগইন করুন</button>
                    </form>
                  ) : (
                    <form onSubmit={customerRegister} style={{display:'flex',flexDirection:'column',gap:15}}>
                      <h2 style={{margin:0}}>✨ নতুন অ্যাকাউন্ট খুলুন</h2>
                      <input style={inputStyle} required placeholder="আপনার পূর্ণ নাম" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})}/>
                      <input style={inputStyle} required type="tel" maxLength={11} placeholder="মোবাইল নম্বর (১১ ডিজিট)" value={authForm.phone} onChange={e=>{ const v=e.target.value.replace(/\D/g,''); if(v.length<=11) setAuthForm({...authForm,phone:v}); }}/>
                      <input style={inputStyle} type="email" required placeholder="ইমেইল অ্যাড্রেস" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})}/>
                      <input style={inputStyle} type="password" required minLength={6} placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})}/>
                      <button style={btn('#059669')} disabled={busy}>অ্যাকাউন্ট খুলুন</button>
                    </form>
                  )}
                </div>
              ) : (
                <div>
                  <div style={panel}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                      <h2 style={{margin:0}}>👤 আমার অ্যাকাউন্ট</h2>
                      <button style={btn('#ef4444')} onClick={logout}>লগআউট</button>
                    </div>
                    <p style={{color:'#64748b'}}>ইমেইল: <b>{session.user.email}</b></p>
                    <form onSubmit={saveProfile} style={{display:'flex',flexDirection:'column',gap:12}}>
                      <input style={inputStyle} placeholder="আপনার নাম" value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})}/>
                      <input style={inputStyle} type="tel" maxLength={11} placeholder="মোবাইল নম্বর" value={profileForm.phone} onChange={e=>{ const v=e.target.value.replace(/\D/g,''); if(v.length<=11) setProfileForm({...profileForm,phone:v}); }}/>
                      <textarea style={{...inputStyle,height:70}} placeholder="ডেলিভারির ঠিকানা (পরের অর্ডারে নিজে থেকে বসবে)" value={profileForm.address} onChange={e=>setProfileForm({...profileForm,address:e.target.value})}/>
                      <button style={btn('#0284c7')} disabled={busy}>তথ্য সেভ করুন</button>
                    </form>
                  </div>

                  <div style={panel}>
                    <h3 style={{marginTop:0}}>📦 আমার অর্ডারসমূহ</h3>
                    {orders.filter(o=>o.user_id===session.user.id).length === 0 ? (
                      <p style={{color:'#64748b'}}>আপনি এখনো কোনো অর্ডার করেননি।</p>
                    ) : orders.filter(o=>o.user_id===session.user.id).map(o=>(
<div key={o.id} style={{border:'1px solid #e2e8f0',borderRadius:12,padding:15,marginBottom:12,background:o.status==='Cancelled'?'#fef2f2':'#f8fafc'}}>
                        <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                          <b>{o.order_code}</b>
                          <span style={{fontWeight:700,color:o.status==='Cancelled'?'#dc2626':o.status==='Completed'?'#059669':'#d97706'}}>{o.status}</span>
                        </div>
                        <div style={{fontSize:13,color:'#64748b',margin:'4px 0'}}>{new Date(o.created_at).toLocaleString()}</div>
                        {(o.order_items||[]).map(item=>(
                          <div key={item.id} style={{fontSize:14}}>• {item.product_name  item.products?.name  'পণ্য'} {item.variant ? '('+item.variant+')' : ''} × {item.qty}</div>
                        ))}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,flexWrap:'wrap',gap:8}}>
                          <strong style={{color:'#059669'}}>মোট: {money(o.total)}</strong>
                          <button onClick={()=>downloadInvoice(o)} style={{padding:'6px 12px',background:'#0284c7',color:'#fff',border:0,borderRadius:6,cursor:'pointer',fontWeight:600}}>📥 ইনভয়েস</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab==='admin' && (
            <div>
              {!isAdmin ? (
                <div style={{maxWidth:400,margin:'40px auto',...panel,textAlign:'center'}}>
                  <h2>🔐 অ্যাডমিন / পার্টনার লগইন</h2>
                  <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:15,marginTop:20}}>
                    <input style={inputStyle} type="email" required placeholder="ইমেইল অ্যাড্রেস" value={email} onChange={e=>setEmail(e.target.value)}/>
                    <input style={inputStyle} type="password" required placeholder="পাসওয়ার্ড" value={password} onChange={e=>setPassword(e.target.value)}/>
                    <button style={btn()}>লগইন করুন</button>
                  </form>
                </div>
              ) : (
                <div style={{backgroundImage:linear-gradient(#f8fafcee,#f8fafcee),url("${settings.dashboardBg}"),backgroundSize:'cover',padding:20,borderRadius:20}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:25}}>
                    <h2>⚙️ বিজনেস অ্যানালিটিক্স ও অ্যাডমিন প্যানেল</h2>
                    <button style={btn('#ef4444')} onClick={logout}>লগআউট</button>
                  </div>

                  {/* মূল পরিসংখ্যান কার্ড */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:20,marginBottom:20}}>
                    <div style={{background:'#0f172a',color:'#fff',padding:20,borderRadius:12}}>
                      <p style={{margin:'0 0 5px 0',color:'#94a3b8'}}>Total Orders</p>
                      <h3 style={{margin:0,fontSize:26}}>{orders.length} Orders</h3>
                    </div>
                    <div style={{background:'#059669',color:'#fff',padding:20,borderRadius:12}}>
                      <p style={{margin:'0 0 5px 0',color:'#d1fae5'}}>Total Revenue</p>
                      <h3 style={{margin:0,fontSize:26}}>{money(revenue)}</h3>
                    </div>
                    <div style={{background:'#0284c7',color:'#fff',padding:20,borderRadius:12}}>
                      <p style={{margin:'0 0 5px 0',color:'#bae6fd'}}>Total Profit</p>
                      <h3 style={{margin:0,fontSize:26}}>{money(totalProfit)}</h3>
                    </div>
                  </div>
{/* প্রফিট অ্যানালিটিক্স */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:20,marginBottom:30}}>
                    <div style={{background:'#fff',padding:20,borderRadius:12,borderLeft:'5px solid #10b981',boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                      <p style={{margin:'0 0 5px 0',color:'#64748b',fontWeight:600}}>আজকের প্রফিট (Daily)</p>
                      <h4 style={{margin:0,fontSize:20,color:'#059669'}}>{money(analytics.dailyP)}</h4>
                    </div>
                    <div style={{background:'#fff',padding:20,borderRadius:12,borderLeft:'5px solid #3b82f6',boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                      <p style={{margin:'0 0 5px 0',color:'#64748b',fontWeight:600}}>সাপ্তাহিক প্রফিট (Weekly)</p>
                      <h4 style={{margin:0,fontSize:20,color:'#0284c7'}}>{money(analytics.weeklyP)}</h4>
                    </div>
                    <div style={{background:'#fff',padding:20,borderRadius:12,borderLeft:'5px solid #8b5cf6',boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                      <p style={{margin:'0 0 5px 0',color:'#64748b',fontWeight:600}}>মাসিক প্রফিট (Monthly)</p>
                      <h4 style={{margin:0,fontSize:20,color:'#7c3aed'}}>{money(analytics.monthlyP)}</h4>
                    </div>
                    <div style={{background:'#fff',padding:20,borderRadius:12,borderLeft:'5px solid #f59e0b',boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                      <p style={{margin:'0 0 5px 0',color:'#64748b',fontWeight:600}}>বার্ষিক প্রফিট (Yearly)</p>
                      <h4 style={{margin:0,fontSize:20,color:'#d97706'}}>{money(analytics.yearlyP)}</h4>
                    </div>
                  </div>

                  {/* গ্রাফ ও সেলস গ্রোথ ড্যাশবোর্ড সেকশন */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',gap:25,marginBottom:25}}>
                    <div style={panel}>
                      <h3 style={{marginTop:0,marginBottom:15}}>📊 প্রফিট গ্রোথ ওভারভিউ</h3>
                      <div style={{display:'flex',flexDirection:'column',gap:12}}>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span>ডেইলি গ্রোথ (Daily Growth)</span>
                            <span style={{fontWeight:700}}>{money(analytics.dailyP)}</span>
                          </div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#10b981',width:${Math.min(100, (analytics.dailyP / 5000) * 100)}%,height:'100%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span>সাপ্তাহিক গ্রোথ (Weekly Growth)</span>
                            <span style={{fontWeight:700}}>{money(analytics.weeklyP)}</span>
                          </div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#3b82f6',width:${Math.min(100, (analytics.weeklyP / 30000) * 100)}%,height:'100%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span>মাসিক গ্রোথ (Monthly Growth)</span>
                            <span style={{fontWeight:700}}>{money(analytics.monthlyP)}</span>
</div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#8b5cf6',width:${Math.min(100, (analytics.monthlyP / 120000) * 100)}%,height:'100%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={panel}>
                      <h3 style={{marginTop:0,marginBottom:15}}>📈 সেলস পরিসংখ্যান (Sales Analytics)</h3>
                      <div style={{display:'flex',flexDirection:'column',gap:14}}>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span style={{fontWeight:600}}>চলতি মাসের মোট সেলস (Monthly Sales)</span>
                            <span style={{fontWeight:700, color:'#059669'}}>{money(analytics.monthlyS)}</span>
                          </div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#059669',width:${Math.min(100, (analytics.monthlyS / 250000) * 100)}%,height:'100%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span style={{fontWeight:600}}>চলতি বছরের মোট সেলস (Yearly Sales)</span>
                            <span style={{fontWeight:700, color:'#0284c7'}}>{money(analytics.yearlyS)}</span>
                          </div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#0284c7',width:${Math.min(100, (analytics.yearlyS / 3000000) * 100)}%,height:'100%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {adminRole === 'owner' && (
                  <>
                  {/* পার্টনার ম্যানেজমেন্ট */}
                  <div style={panel}>
                    <h3>👥 পার্টনার ম্যানেজমেন্ট (অ্যাক্সেস প্রদান)</h3>
                    <form onSubmit={addPartner} style={{display:'flex',gap:10,marginTop:15}}>
                      <input style={{...inputStyle, flex:1}} type="email" required placeholder="পার্টনারের ইমেইল অ্যাড্রেস দিন" value={newPartnerEmail} onChange={e=>setNewPartnerEmail(e.target.value)}/>
                      <button style={btn('#059669')}>পার্টনার যুক্ত করুন</button>
                    </form>
                    <div style={{marginTop:15,display:'flex',flexWrap:'wrap',gap:10}}>
                      {partners.map(pt=>(
                        <div key={pt.id} style={{background:'#f1f5f9',padding:'8px 15px',borderRadius:8,display:'flex',alignItems:'center',gap:10,border:'1px solid #cbd5e1'}}>
                          <span>{pt.email}</span>
                          <button onClick={()=>deletePartner(pt.id)} style={{background:'#dc2626',color:'#fff',border:0,borderRadius:4,padding:'2px 8px',cursor:'pointer'}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  </>
                  )}

                  {/* ওয়েবসাইট সেটিংস ও ব্র‍্যান্ডিং */}
                  <div style={panel}>
                    <h3>🎨 ওয়েবসাইট কাস্টমাইজেশন ও ব্র‍্যান্ডিং</h3>
                    <form onSubmit={saveSettings} style={{display:'flex',flexDirection:'column',gap:15,marginTop:15}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15}}>
<div>
                          <label style={{display:'block',marginBottom:5,fontWeight:600}}>ওয়েবসাইটের নাম</label>
                          <input style={inputStyle} value={tempSettings.owner.name} onChange={e=>setTempSettings({...tempSettings, owner:{...tempSettings.owner, name:e.target.value}})}/>
                        </div>
                        <div>
                          <label style={{display:'block',marginBottom:5,fontWeight:600}}>যোগাযোগ নম্বর</label>
                          <input style={inputStyle} value={tempSettings.owner.phone} onChange={e=>setTempSettings({...tempSettings, owner:{...tempSettings.owner, phone:e.target.value}})}/>
                        </div>
                      </div>
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:600}}>ঠিকানা</label>
                        <input style={inputStyle} value={tempSettings.owner.address} onChange={e=>setTempSettings({...tempSettings, owner:{...tempSettings.owner, address:e.target.value}})}/>
                      </div>
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:600}}>Friends Bazaar পরিচিতি (Bio / Description)</label>
                        <textarea style={{...inputStyle,height:70}} value={tempSettings.owner.description} onChange={e=>setTempSettings({...tempSettings, owner:{...tempSettings.owner, description:e.target.value}})}/>
                      </div>

                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:15,marginTop:10}}>
                        <div>
                          <label style={{display:'block',marginBottom:5,fontWeight:600}}>লোগো ইমেজ ফাইল</label>
                          <input type="file" id="logoInput" accept="image/*" style={inputStyle}/>
                        </div>
                        <div>
                          <label style={{display:'block',marginBottom:5,fontWeight:600}}>শপ ব্যানার ইমেজ ফাইল</label>
                          <input type="file" id="bannerInput" accept="image/*" style={inputStyle}/>
                        </div>
                        <div>
                          <label style={{display:'block',marginBottom:5,fontWeight:600}}>ড্যাশবোর্ড ব্যাকগ্রাউন্ড ইমেজ</label>
                          <input type="file" id="bgInput" accept="image/*" style={inputStyle}/>
                        </div>
                      </div>

                      <button style={{...btn('#0284c7'),marginTop:10}}>সেটিংস ও ব্র‍্যান্ডিং সেভ করুন</button>
                    </form>
                  </div>

                  {/* প্রোডাক্ট ম্যানেজমেন্ট (ছবি ডিলিট, পজিশন বদলানো, ভ্যারিয়েন্ট ও আই-ক্যাচি ডেসক্রিপশন সহ) */}
                  <div style={panel}>
                    <h3>{editing ? '✏️ পণ্য এডিট করুন' : '➕ নতুন পণ্য যোগ করুন'}</h3>
                    <form onSubmit={saveProduct} style={{display:'flex',flexDirection:'column',gap:12,marginTop:15}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12}}>
                        <input style={inputStyle} required placeholder="পণ্যের নাম" value={(editing||newProduct).name} onChange={e=>editing?setEditing({...editing,name:e.target.value}):setNewProduct({...newProduct,name:e.target.value})}/>
                        <input style={inputStyle} required type="number" placeholder="ক্রয়মূল্য (Cost)" value={(editing||newProduct).cost} onChange={e=>editing?setEditing({...editing,cost:e.target.value}):setNewProduct({...newProduct,cost:e.target.value})}/>
                        <input style={inputStyle} required type="number" placeholder="বিক্রয়মূল্য (Price)" value={(editing||newProduct).price} onChange={e=>editing?setEditing({...editing,price:e.target.value}):setNewProduct({...newProduct,price:e.target.value})}/>
<input style={inputStyle} required type="number" placeholder="স্টক পরিমাণ" value={(editing||newProduct).stock} onChange={e=>editing?setEditing({...editing,stock:e.target.value}):setNewProduct({...newProduct,stock:e.target.value})}/>
                      </div>
                      
                      <textarea style={{...inputStyle, height:90}} placeholder="পণ্যের বিবরণ (লাইন বাই লাইন বা পয়েন্ট আকারে লিখুন)" value={(editingnewProduct).description''} onChange={e=>editing?setEditing({...editing,description:e.target.value}):setNewProduct({...newProduct,description:e.target.value})}/>
                      <textarea style={{...inputStyle, height:70}} placeholder="উপকারিতা" value={(editingnewProduct).benefits''} onChange={e=>editing?setEditing({...editing,benefits:e.target.value}):setNewProduct({...newProduct,benefits:e.target.value})}/>
                      <textarea style={{...inputStyle, height:70}} placeholder="সতর্কতা / বিশেষ দ্রষ্টব্য" value={(editingnewProduct).drawbacks''} onChange={e=>editing?setEditing({...editing,drawbacks:e.target.value}):setNewProduct({...newProduct,drawbacks:e.target.value})}/>
                      
                      {/* ৩. সাইজ বা ওজন ভ্যারিয়েন্ট সেকশন (যেমন: ২০ গ্রাম, ৩০ গ্রাম ইত্যাদি) */}
                      <div style={{background:'#f1f5f9',padding:15,borderRadius:12}}>
                        <label style={{display:'block',marginBottom:8,fontWeight:700}}>⚖️ সাইজ / ওজন ভ্যারিয়েন্ট যুক্ত করুন (যেমন: ২০ গ্রাম, ৫০ গ্রাম ইত্যাদি):</label>
                        <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
                          <input style={{...inputStyle, flex:2}} placeholder="নাম (যেমন: ২০ গ্রাম)" value={newVariantInput.name} onChange={e=>setNewVariantInput({...newVariantInput, name:e.target.value})}/>
                          <input style={{...inputStyle, flex:1}} type="number" placeholder="দাম (৳)" value={newVariantInput.price} onChange={e=>newVariantInput({...newVariantInput, price:e.target.value})}/>
                          <input style={{...inputStyle, flex:1}} type="number" placeholder="স্টক" value={newVariantInput.stock} onChange={e=>newVariantInput({...newVariantInput, stock:e.target.value})} />
                          <button type="button" onClick={addVariant} style={btn('#0284c7')}>ভ্যারিয়েন্ট যোগ করুন</button>
                        </div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {((editing  newProduct).variants  []).map((v, idx)=>(
                            <div key={idx} style={{background:'#fff',border:'1px solid #cbd5e1',padding:'6px 12px',borderRadius:8,display:'flex',alignItems:'center',gap:8}}>
                              <span><b>{v.name}</b> - {money(v.price)} (স্টক: {v.stock})</span>
                              <button type="button" onClick={()=>removeVariant(idx)} style={{background:'#dc2626',color:'#fff',border:0,borderRadius:4,padding:'2px 6px',cursor:'pointer'}}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ১. মাল্টি-ইমেজ আপলোড ও ম্যানেজমেন্ট (ক্রস ও তীর চিহ্ন দিয়ে পজিশন বদলানোর অপশন সহ) */}
                      <div>
                        <label style={{display:'block',marginBottom:5,fontWeight:600}}>📸 ছবি ম্যানেজমেন্ট (ক্রস দিয়ে ডিলিট ও তীর দিয়ে পজিশন বদলান)</label>
                        <input type="file" accept="image/*" multiple onChange={handleMultipleImagesUpload}/>
                        
                        <div style={{display:'flex',gap:12,marginTop:12,overflowX:'auto',paddingBottom:5}}>
                          {((editing  newProduct).images  []).map((imgUrl, imgIdx)=>(
                            <div key={imgIdx} style={{position:'relative',border:imgIdx===0?'3px solid #059669':'1px solid #cbd5e1',borderRadius:10,padding:4,background:'#fff',minWidth:90,textAlign:'center'}}>
<img src={imgUrl} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:8}}/>
                              <div style={{fontSize:11,fontWeight:700,color:imgIdx===0?'#059669':'#64748b'}}>{imgIdx===0 ? '★ কভার ইমেজ' : ${imgIdx+1} নম্বর}</div>
                              
                              <button type="button" onClick={()=>removeImage(imgIdx)} style={{position:'absolute',top:0,right:0,background:'#dc2626',color:'#fff',border:0,borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:12,fontWeight:700}} title="ডিলিট করুন">✕</button>
                              
                              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                                <button type="button" disabled={imgIdx===0} onClick={()=>moveImage(imgIdx, 'left')} style={{fontSize:11,padding:'2px 4px',cursor:imgIdx===0?'not-allowed':'pointer'}}>◀</button>
                                <button type="button" disabled={imgIdx===((editing  newProduct).images.length-1)} onClick={()=>moveImage(imgIdx, 'right')} style={{fontSize:11,padding:'2px 4px',cursor:imgIdx===((editing  newProduct).images.length-1)?'not-allowed':'pointer'}}>▶</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <small style={{color:'#64748b'}}>* ১ নম্বর ছবিটি (সবুজ বর্ডারযুক্ত) প্রডাক্টের মেইন কভার ইমেজ হিসেবে দেখাবে।</small>
                      </div>

                      <div style={{display:'flex',gap:10,marginTop:10}}>
                        <button style={btn('#059669')}>{editing?'পণ্য আপডেট করুন':'পণ্য যুক্ত করুন'}</button>
                        {editing && <button type="button" onClick={()=>setEditing(null)} style={btn('#64748b')}>বাতিল</button>}
                      </div>
                    </form>

                    <h4 style={{marginTop:30,marginBottom:15}}>বর্তমান প্রোডাক্ট তালিকা</h4>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))',gap:15}}>
                      {products.map(p=>(
                        <div key={p.id} style={{background:'#f8fafc',padding:15,borderRadius:12,border:'1px solid #e2e8f0',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                          <div>
                            <img src={p.image_url} alt="" style={{width:'100%',height:120,objectFit:'cover',borderRadius:8,marginBottom:10}}/>
                            <h4 style={{margin:'0 0 5px 0'}}>{p.name}</h4>
                            <p style={{margin:0,color:'#059669',fontWeight:700}}>{money(p.price)} (স্টক: {p.stock})</p>
                            {p.variants?.length > 0 && <small style={{color:'#0284c7'}}>ভ্যারিয়েন্ট আছে: {p.variants.length}টি</small>}
                          </div>
                          <div style={{display:'flex',gap:8,marginTop:15}}>
                            <button onClick={()=>setEditing(p)} style={{...btn('#0284c7'),flex:1,padding:8}}>এডিট</button>
                            <button onClick={()=>deleteProduct(p.id)} style={{...btn('#dc2626'),flex:1,padding:8}}>ডিলিট</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* কাস্টমারদের কার্ট (অর্ডার হয়নি) */}
                  <div style={panel}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                      <h3 style={{margin:0}}>🛒 কাস্টমারদের কার্ট (এখনো অর্ডার করেনি)</h3>
                      <button onClick={loadCarts} style={{...btn('#0284c7'),padding:'8px 14px'}}>🔄 রিফ্রেশ</button></div>
                    {customerCarts.length === 0 ? (
                      <p style={{color:'#64748b'}}>এখন কোনো লগইন করা কাস্টমারের কার্টে পণ্য নেই।</p>
                    ) : (
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:15,marginTop:15}}>
                        {customerCarts.map(c=>(
                          <div key={c.user_id} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:15}}>
                            <b>{c.full_name || 'নাম দেয়নি'}</b>
                            <div style={{fontSize:13,color:'#64748b',marginBottom:8}}>{c.phone}{c.phone && c.email ? ' • ' : ''}{c.email}</div>
                            {(c.items||[]).map((it,idx)=>(
                              <div key={idx} style={{fontSize:14}}>• {it.name} {it.variant ? '('+it.variant+')' : ''} × {it.qty}</div>
                            ))}
                            <div style={{marginTop:8,fontWeight:700,color:'#059669'}}>মোট: {money(c.total)}</div>
                            <small style={{color:'#64748b'}}>সর্বশেষ আপডেট: {new Date(c.updated_at).toLocaleString()}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* অর্ডার লিস্ট ও ইনভয়েস ম্যানেজমেন্ট */}
                  <div style={panel}>
                    <h3>📦 কাস্টমার অর্ডারসমূহ ও ইনভয়েস ম্যানেজমেন্ট</h3>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',marginTop:10,fontSize:14}}>
                        <thead>
                          <tr style={{background:'#f1f5f9',textAlign:'left'}}>
                            <th style={{padding:10}}>অর্ডার কোড</th>
                            <th style={{padding:10}}>পণ্য ও সাইজ</th>
                            <th style={{padding:10}}>গ্রাহক</th>
                            <th style={{padding:10}}>ঠিকানা ও ফোন</th>
                            <th style={{padding:10}}>পেমেন্ট মাধ্যম</th>
                            <th style={{padding:10}}>মোট টাকা</th>
                            <th style={{padding:10}}>স্ট্যাটাস</th>
                            <th style={{padding:10}}>ইনভয়েস ও ডিলিট</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o=>(
                            <tr key={o.id} style={{borderBottom:'1px solid #e2e8f0', background: o.status==='Cancelled' ? '#fef2f2' : 'transparent'}}>
                              <td style={{padding:10}}><b>{o.order_code}</b></td>
                              <td style={{padding:10}}>
                                {(o.order_items||[]).map((it,idx)=>(
                                  <div key={idx}>• {it.product_name || it.products?.name} {it.variant ? '('+it.variant+')' : ''} × {it.qty}</div>
                                ))}
                              </td>
                              <td style={{padding:10}}>{o.customer_name}</td>
                              <td style={{padding:10}}>{o.address}<br/><small>{o.phone}</small></td>
                              <td style={{padding:10}}>{o.trx_id === 'Cash on Delivery' ? 'Cash on Delivery' : bKash (${o.trx_id})}</td>
                              <td style={{padding:10,fontWeight:700,color:'#059669'}}>{money(o.total)}</td>
                              <td style={{padding:10}}>
                                <select value={o.status} onChange={e=>updateOrderStatus(o.id, e.target.value)} style={{padding:6,borderRadius:6,border:'1px solid #cbd5e1'}}>
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
