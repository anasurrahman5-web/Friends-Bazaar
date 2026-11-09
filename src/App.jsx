import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase';

const DEFAULT_SETTINGS = {
  owner: {
    name: 'Md Anasur Rahman',
    email: 'anasurrahman5@gmail.com',
    phone: '01722023943',
    address: 'আশুগঞ্জ, ব্রাহ্মণবাড়িয়া, বাংলাদেশ',
    description: 'খাঁটি, নিরাপদ ও প্রিমিয়াম কোয়ালিটি পণ্য অর্ডার করুন খুব সহজেই ঘরে বসে।'
  },
  payment: { methodName: 'বিকাশ পার্সোনাল', accountNumber: '01722023943' },
  logo: '',
  banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
};

const money = n => `৳ ${Number(n || 0).toLocaleString('en-BD')}`;
const inputStyle = { padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontSize: '15px' };
const btn = (bg='#0f172a') => ({ background:bg, color:'#fff', border:0, padding:'12px 18px', borderRadius:10, cursor:'pointer', fontWeight:700, transition: 'all 0.2s' });
const panel = { background:'#fff', padding:25, borderRadius:16, border:'1px solid #e2e8f0', marginBottom:25, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' };

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
  const [checkout, setCheckout] = useState({ name:'', phone:'', address:'', trxId:'' });
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  
  // Product Details Modal & Gallery State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [newProduct, setNewProduct] = useState({ 
    name: '', cost: '', price: '', stock: '', 
    description: '', benefits: '', drawbacks: '', image_url: '', images: [] 
  });
  const [editing, setEditing] = useState(null);
  const [partner, setPartner] = useState({ name:'', email:'' });
  const [tempSettings, setTempSettings] = useState(DEFAULT_SETTINGS);

  const isAdmin = ['admin', 'owner'].includes(adminRole);

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
    setSettings({ ...DEFAULT_SETTINGS, ...nextSettings,
      owner:{...DEFAULT_SETTINGS.owner, ...(nextSettings.owner || {})},
      payment:{...DEFAULT_SETTINGS.payment, ...(nextSettings.payment || {})}
    });
    setTempSettings({ ...DEFAULT_SETTINGS, ...nextSettings,
      owner:{...DEFAULT_SETTINGS.owner, ...(nextSettings.owner || {})},
      payment:{...DEFAULT_SETTINGS.payment, ...(nextSettings.payment || {})}
    });
    if (session) {
      const o = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending:false });
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
  useEffect(() => {
    if (!isConfigured) return;
    const channel = supabase.channel('friends-bazar-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'products' }, loadAll)
      .on('postgres_changes', { event:'*', schema:'public', table:'site_settings' }, loadAll)
      .on('postgres_changes', { event:'*', schema:'public', table:'orders' }, () => { if (session) loadAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0), [cart]);
  const revenue = orders.reduce((sum,o) => sum + Number(o.total || 0), 0);
  const profit = orders.reduce((sum,o) => sum + Number(o.profit || 0), 0);

  async function login(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setNotice('লগইন হয়নি: ' + error.message);
    else { setPassword(''); setNotice('লগইন সফল হয়েছে।'); }
  }
  async function logout() {
    await supabase.auth.signOut();
    setOrders([]); setPartners([]); setAdminRole(''); setTab('shop'); setNotice('লগআউট সম্পন্ন হয়েছে।');
  }

  function addToCart(p) {
    if (p.stock < 1) return setNotice('দুঃখিত, পণ্যটি স্টকে নেই।');
    const found = cart.find(x => x.id === p.id);
    if (found && found.qty >= p.stock) return setNotice('স্টকের বেশি কার্টে যোগ করা যাবে না।');
    setCart(old => found ? old.map(x => x.id === p.id ? {...x, qty:x.qty+1} : x) : [...old, {...p, qty:1}]);
    setNotice('');
  }
  function changeQty(id, delta) {
    setCart(old => old.map(x => x.id === id ? {...x, qty:Math.max(0, Math.min(Number(x.stock), x.qty+delta))} : x).filter(x => x.qty > 0));
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!cart.length) return;
    setBusy(true); setNotice('');
    const items = cart.map(x => ({ product_id:x.id, qty:x.qty }));
    const { data, error } = await supabase.rpc('create_public_order', {
      p_customer_name: checkout.name.trim(),
      p_phone: checkout.phone.trim(),
      p_address: checkout.address.trim(),
      p_trx_id: checkout.trxId.trim(),
      p_items: items
    });
    setBusy(false);
    if (error) { setNotice('অর্ডার করা যায়নি: ' + error.message); return; }
    setSuccess(data?.order_code || 'অর্ডার গ্রহণ করা হয়েছে');
    setCart([]); setCheckout({name:'',phone:'',address:'',trxId:''});
    await loadAll();
  }

  async function uploadImage(file, path) {
    if (!file) return '';
    if (!file.type.startsWith('image/')) throw new Error('শুধু image ফাইল আপলোড করুন।');
    if (file.size > 5 * 1024 * 1024) throw new Error('ছবির সাইজ ৫ MB-এর কম হতে হবে।');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `${path}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(key, file, { upsert:false });
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
      const existingImages = target.images || [];
      const combinedImages = [...existingImages, ...uploadedUrls];
      const mainCover = target.image_url || combinedImages[0] || '';

      if (editing) {
        setEditing({ ...editing, images: combinedImages, image_url: mainCover });
      } else {
        setNewProduct({ ...newProduct, images: combinedImages, image_url: mainCover });
      }
      setNotice('একাধিক ছবি সফলভাবে আপলোড হয়েছে!');
    } catch (err) {
      setNotice(err.message);
    }
    setBusy(false);
  }

  async function saveProduct(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const source = editing || newProduct;
      const allImages = source.images && source.images.length > 0 ? source.images : (source.image_url ? [source.image_url] : []);
      const coverImage = source.image_url || allImages[0] || null;

      const row = { 
        name: source.name.trim(), 
        cost: Number(source.cost), 
        price: Number(source.price), 
        stock: Number(source.stock), 
        description: source.description || '',
        benefits: source.benefits || '',
        drawbacks: source.drawbacks || '',
        image_url: coverImage, 
        images: allImages 
      };

      const result = editing
        ? await supabase.from('products').update(row).eq('id', editing.id)
        : await supabase.from('products').insert(row);

      if (result.error) throw result.error;
      setEditing(null); 
      setNewProduct({name:'', cost:'', price:'', stock:'', description:'', benefits:'', drawbacks:'', image_url:'', images:[]});
      await loadAll(); 
      setNotice('পণ্য সফলভাবে সংরক্ষণ করা হয়েছে।');
    } catch(err) { setNotice(err.message); }
    setBusy(false);
  }

  async function deleteProduct(id) {
    if (!confirm('এই পণ্যটি মুছে ফেলবেন?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    setNotice(error ? error.message : 'পণ্য মুছে ফেলা হয়েছে।'); await loadAll();
  }

  async function stockChange(p, delta) {
    const { error } = await supabase.from('products').update({stock:Math.max(0, p.stock+delta)}).eq('id',p.id);
    if (error) setNotice(error.message); else await loadAll();
  }

  async function saveSettings(e) {
    e.preventDefault(); setBusy(true);
    try {
      const files = e.currentTarget.querySelectorAll('input[type=file]');
      let next = {...tempSettings};
      if (files[0]?.files?.[0]) next.logo = await uploadImage(files[0].files[0], 'branding');
      if (files[1]?.files?.[0]) next.banner = await uploadImage(files[1].files[0], 'branding');
      const { error } = await supabase.from('site_settings').upsert({id:1,value:next});
      if (error) throw error;
      setSettings(next); setTempSettings(next); setNotice('ওয়েবসাইটের সেটিংস আপডেট হয়েছে।');
    } catch(err) { setNotice(err.message); }
    setBusy(false);
  }

  async function addPartner(e) {
    e.preventDefault();
    const { error } = await supabase.from('partners').insert({name:partner.name.trim(),email:partner.email.trim(),role:'Co-Admin'});
    if (error) setNotice(error.message); else {setPartner({name:'',email:''}); setNotice('পার্টনারের তথ্য যুক্ত হয়েছে।'); await loadAll();}
  }

  async function removePartner(id) {
    const { error } = await supabase.from('partners').delete().eq('id',id);
    setNotice(error ? error.message : 'পার্টনারের তথ্য মুছে ফেলা হয়েছে।'); await loadAll();
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('orders').update({status}).eq('id',id);
    setNotice(error ? error.message : 'অর্ডারের অবস্থা আপডেট হয়েছে।'); await loadAll();
  }

  if (!isConfigured) return <div style={{maxWidth:760,margin:'50px auto',padding:24,fontFamily:'Arial',lineHeight:1.7}}>
    <h1>Friends Bazar – Supabase সেটআপ বাকি</h1>
    <p>প্রজেক্টে <code>.env</code> ফাইলে VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY বসাও। এরপর Supabase SQL Editor-এ <code>supabase/schema.sql</code> চালাও।</p>
  </div>;

  return <div style={{fontFamily:"Inter,Arial,sans-serif",background:'#f8fafc',minHeight:'100vh',color:'#1e293b',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
    <div>
      <nav className="topnav" style={{background:'#0f172a',color:'#fff',padding:'15px 30px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:1000,boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
        <div className="brand" onClick={()=>setTab('shop')} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:22,fontWeight:900,color:'#38bdf8'}}>
          {settings.logo ? <img src={settings.logo} alt="Friends Bazar" style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}}/> : '🛒'} <span>Friends Bazar</span>
        </div>
        <div className="navbuttons" style={{display:'flex',gap:12}}>
          <button style={btn(tab==='shop'?'#38bdf8':'#334155')} onClick={()=>setTab('shop')}>🛍️ শপ</button>
          <button style={btn(tab==='cart'?'#38bdf8':'#334155')} onClick={()=>setTab('cart')}>🛒 কার্ট ({cart.reduce((a,b)=>a+b.qty,0)})</button>
          <button style={btn(tab==='admin'?'#e11d48':'#334155')} onClick={()=>setTab('admin')}>⚙️ অ্যাডমিন</button>
        </div>
      </nav>

      {notice && <div className="notice" onClick={()=>setNotice('')} style={{background:'#38bdf8',color:'#0f172a',padding:12,textAlign:'center',fontWeight:700,cursor:'pointer'}}>{notice}　✕</div>}
      
      <main className="page" style={{maxWidth:1200,margin:'30px auto',padding:'0 20px'}}>
        {tab==='shop' && <>
          <section className="hero" style={{backgroundImage:`linear-gradient(#0f172acc,#1e293bcc),url("${settings.banner}")`,backgroundSize:'cover',backgroundPosition:'center',padding:'60px 20px',borderRadius:20,textAlign:'center',color:'#fff',marginBottom:40,boxShadow:'0 10px 25px rgba(0,0,0,0.1)'}}>
            <h1 style={{fontSize:38,fontWeight:800,color:'#38bdf8',marginBottom:10}}>স্বাগতম Friends Bazaar-এ</h1>
            <p style={{fontSize:18,color:'#cbd5e1'}}>{settings.owner.description}</p>
          </section>
          
          <div className="products" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:25}}>
            {products.map(p=><article className="product" key={p.id} style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.04)',display:'flex',flexDirection:'column',border:'1px solid #e2e8f0',transition:'transform 0.2s'}}>
              <div onClick={()=>{ setSelectedProduct(p); setActiveImageIndex(0); }} style={{cursor:'pointer',overflow:'hidden',height:200,background:'#f1f5f9'}}>
                <img src={p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.3s'}}/>
              </div>
              <div className="productbody" style={{padding:20,flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                <div>
                  <h3 onClick={()=>{ setSelectedProduct(p); setActiveImageIndex(0); }} style={{cursor:'pointer',color:'#0f172a',fontSize:18,fontWeight:700,marginBottom:8}}>{p.name}</h3>
                  <strong className="price" style={{color:'#059669',fontSize:22}}>{money(p.price)}</strong>
                  <p className="stock" style={{fontSize:13,marginTop:5,color:p.stock>0?'#059669':'#dc2626',fontWeight:600}}>{p.stock>0?`স্টক আছে: ${p.stock} টি`:'স্টক আউট'}</p>
                </div>
                <div className="actions" style={{display:'flex',gap:10,marginTop:20}}>
                  <button style={{...btn('#0284c7'),flex:1}} disabled={p.stock<1} onClick={()=>addToCart(p)}>কার্টে যোগ</button>
                  <button style={{...btn('#059669'),flex:1}} disabled={p.stock<1} onClick={()=>{addToCart(p);setTab('cart')}}>Buy Now</button>
                </div>
              </div>
            </article>)}
          </div>

          {selectedProduct && (
            <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15, 23, 42, 0.75)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:3000,padding:20,backdropFilter:'blur(5px)'}}>
              <div style={{background:'#fff',padding:35,borderRadius:24,maxWidth:750,width:'100%',maxHeight:'90vh',overflowY:'auto',position:'relative',boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                <button onClick={()=>setSelectedProduct(null)} style={{position:'absolute',top:20,right:20,background:'#f1f5f9',color:'#0f172a',border:0,borderRadius:'50%',width:36,height:36,cursor:'pointer',fontWeight:'bold',fontSize:16}}>✕</button>
                
                <h2 style={{fontSize:26,color:'#0f172a',marginBottom:5}}>{selectedProduct.name}</h2>
                <strong style={{fontSize:26,color:'#059669',display:'block',marginBottom:20}}>{money(selectedProduct.price)}</strong>
                
                <div style={{textAlign:'center',marginBottom:20}}>
                  <div style={{background:'#f8fafc',borderRadius:16,padding:10,border:'1px solid #e2e8f0',display:'inline-block',width:'100%'}}>
                    <img src={(selectedProduct.images && selectedProduct.images[activeImageIndex]) || selectedProduct.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'} alt={selectedProduct.name} style={{maxHeight:320,width:'100%',objectFit:'contain',borderRadius:12}}/>
                  </div>
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:12,overflowX:'auto',paddingBottom:5}}>
                      {selectedProduct.images.map((img, idx)=>(
                        <img key={idx} src={img} alt="" onClick={()=>setActiveImageIndex(idx)} style={{width:65,height:65,objectFit:'cover',borderRadius:8,border:activeImageIndex===idx?'3px solid #0284c7':'3px solid transparent',cursor:'pointer',boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}/>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{margin:'20px 0',lineHeight:1.7,background:'#f8fafc',padding:20,borderRadius:12}}>
                  <h4 style={{color:'#0f172a',marginBottom:8,fontSize:16}}>📋 পণ্যের বিস্তারিত বিবরণ:</h4>
                  <p style={{color:'#475569',fontSize:15}}>{selectedProduct.description || 'এই পণ্যের জন্য কোনো বিস্তারিত বিবরণ দেওয়া হয়নি।'}</p>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:15,margin:'20px 0'}}>
                  <div style={{background:'#f0fdf4',padding:16,borderRadius:12,border:'1px solid #bbf7d0'}}>
                    <h4 style={{color:'#166534',marginBottom:6,fontSize:16}}>✅ সুবিধা ও উপকারিতা (Benefits):</h4>
                    <p style={{fontSize:14,color:'#15803d',lineHeight:1.6}}>{selectedProduct.benefits || 'প্রযোজ্য নয়'}</p>
                  </div>
                  <div style={{background:'#fef2f2',padding:16,borderRadius:12,border:'1px solid #fecaca'}}>
                    <h4 style={{color:'#991b1b',marginBottom:6,fontSize:16}}>⚠️ সতর্কতা / অসুবিধা (Drawbacks):</h4>
                    <p style={{fontSize:14,color:'#b91c1c',lineHeight:1.6}}>{selectedProduct.drawbacks || 'প্রযোজ্য নয়'}</p>
                  </div>
                </div>

                <div style={{display:'flex',gap:15,marginTop:30}}>
                  <button style={{...btn('#0284c7'),flex:1,padding:14}} disabled={selectedProduct.stock<1} onClick={()=>{addToCart(selectedProduct);setSelectedProduct(null);}}>কার্টে যোগ করুন</button>
                  <button style={{...btn('#059669'),flex:1,padding:14}} disabled={selectedProduct.stock<1} onClick={()=>{addToCart(selectedProduct);setSelectedProduct(null);setTab('cart');}}>এখনই কিনুন (Buy Now)</button>
                </div>
              </div>
            </div>
          )}
        </>}

        {tab==='cart' && <section style={{maxWidth:900,margin:'0 auto'}}>
          <h2 style={{fontSize:28,marginBottom:20}}>আপনার শপিং কার্ট ও পেমেন্ট</h2>
          {success ? <div style={{...panel,textAlign:'center',background:'#d1fae5'}}><h2>অর্ডার সফলভাবে গ্রহণ করা হয়েছে! 🎉</h2><h3>অর্ডার আইডি: {success}</h3><p>পেমেন্ট যাচাই করে খুব দ্রুত পার্সেল পাঠিয়ে দেওয়া হবে।</p><button style={btn('#059669')} onClick={()=>{setSuccess('');setTab('shop')}}>আরও কেনাকাটা করুন</button></div> :
          !cart.length ? <div style={{...panel,textAlign:'center',padding:40}}><h3>আপনার কার্ট খালি রয়েছে।</h3><button style={btn('#0284c7')} onClick={()=>setTab('shop')}>শপে ফিরে যান</button></div> :
          <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:25}}>
            <div style={panel}>
              <h3>সিলেক্ট করা পণ্যসমূহ</h3>
              {cart.map(x=><div key={x.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f1f5f9'}}>
                <div><b>{x.name}</b><p style={{color:'#059669',fontWeight:600}}>{money(x.price)} × {x.qty}</p></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}><button onClick={()=>changeQty(x.id,-1)} style={{padding:'4px 10px',background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:6,cursor:'pointer'}}>-</button> <b>{x.qty}</b> <button onClick={()=>changeQty(x.id,1)} style={{padding:'4px 10px',background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:6,cursor:'pointer'}}>+</button></div>
              </div>)}
              <h3 style={{marginTop:20,textAlign:'right'}}>মোট প্রদেয়: <span style={{color:'#059669'}}>{money(cartTotal)}</span></h3>
            </div>
            <div style={panel}>
              <h3>পেমেন্ট ও ডেলিভারি তথ্য</h3>
              <div style={{background:'#fdf2f8',border:'1px solid #fbcfe8',padding:15,borderRadius:10,marginBottom:20,fontSize:14,color:'#be185d'}}>
                <b>{settings.payment.methodName}:</b> <code>{settings.payment.accountNumber}</code><br/>এই নম্বরে সেন্ড মানি করে ট্রানজেকশন আইডি নিচে দিন।
              </div>
              <form style={{display:'flex',flexDirection:'column',gap:12}} onSubmit={placeOrder}>
                <input style={inputStyle} required placeholder="আপনার নাম" value={checkout.name} onChange={e=>setCheckout({...checkout,name:e.target.value})}/>
                <input style={inputStyle} required type="tel" placeholder="মোবাইল নম্বর" value={checkout.phone} onChange={e=>setCheckout({...checkout,phone:e.target.value})}/>
                <textarea style={{...inputStyle,height:80}} required placeholder="পূর্ণাঙ্গ ঠিকানা" value={checkout.address} onChange={e=>setCheckout({...checkout,address:e.target.value})}/>
                <input style={inputStyle} required placeholder="বিকাশ TrxID" value={checkout.trxId} onChange={e=>setCheckout({...checkout,trxId:e.target.value})}/>
                <button style={{...btn('#e11d48'),marginTop:10}} disabled={busy}>{busy?'অপেক্ষা করুন...':`অর্ডার কনফার্ম করুন (${money(cartTotal)})`}</button>
              </form>
            </div>
          </div>}
        </section>}

        {tab==='admin' && <section>
          {!isAdmin ? <div style={{...panel,maxWidth:420,margin:'40px auto',textAlign:'center'}}><h2>🔒 অ্যাডমিন লগইন</h2><p style={{color:'#64748b',margin:'15px 0'}}>Supabase Auth-এ তৈরি করা অ্যাডমিন ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।</p>
            <form style={{display:'flex',flexDirection:'column',gap:12}} onSubmit={login}><input style={inputStyle} type="email" required placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/><input style={inputStyle} type="password" required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button style={btn()} disabled={busy}>{busy?'অপেক্ষা করুন...':'লগইন'}</button></form>
          </div> : <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:25}}><h2>⚙️ কন্ট্রোল প্যানেল</h2><button style={btn('#ef4444')} onClick={logout}>লগআউট</button></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:20,marginBottom:25}}>
              <div style={panel}>মোট অর্ডার<h2 style={{color:'#0284c7',marginTop:5}}>{orders.length}</h2></div>
              <div style={panel}>মোট বিক্রয়<h2 style={{color:'#059669',marginTop:5}}>{money(revenue)}</h2></div>
              <div style={panel}>আনুমানিক লাভ<h2 style={{color:'#d97706',marginTop:5}}>{money(profit)}</h2></div>
            </div>
            
            <div style={panel}>
              <h3>🛍️ নতুন পণ্য যুক্ত করুন বা এডিট করুন (একাধিক ছবি ও ডেসক্রিপশনসহ)</h3>
              <form style={{display:'flex',flexDirection:'column',gap:15,marginTop:15}} onSubmit={saveProduct}>
                <input style={inputStyle} required placeholder="পণ্যের নাম" value={(editing||newProduct).name} onChange={e=>editing?setEditing({...editing,name:e.target.value}):setNewProduct({...newProduct,name:e.target.value})}/>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:12}}>
                  <input style={inputStyle} required type="number" min="0" placeholder="ক্রয়মূল্য (৳)" value={(editing||newProduct).cost} onChange={e=>editing?setEditing({...editing,cost:e.target.value}):setNewProduct({...newProduct,cost:e.target.value})}/>
                  <input style={inputStyle} required type="number" min="0" placeholder="বিক্রয়মূল্য (৳)" value={(editing||newProduct).price} onChange={e=>editing?setEditing({...editing,price:e.target.value}):setNewProduct({...newProduct,price:e.target.value})}/>
                  <input style={inputStyle} required type="number" min="0" placeholder="স্টক পরিমাণ" value={(editing||newProduct).stock} onChange={e=>editing?setEditing({...editing,stock:e.target.value}):setNewProduct({...newProduct,stock:e.target.value})}/>
                </div>
                <textarea style={{...inputStyle,height:90}} placeholder="পণ্যের বিস্তারিত বিবরণ (Description)" value={(editing||newProduct).description || ''} onChange={e=>editing?setEditing({...editing,description:e.target.value}):setNewProduct({...newProduct,description:e.target.value})}/>
                <textarea style={{...inputStyle,height:80}} placeholder="পণ্যের সুবিধা বা উপকারিতা (Benefits)" value={(editing||newProduct).benefits || ''} onChange={e=>editing?setEditing({...editing,benefits:e.target.value}):setNewProduct({...newProduct,benefits:e.target.value})}/>
                <textarea style={{...inputStyle,height:80}} placeholder="সতর্কতা বা অসুবিধা (Drawbacks)" value={(editing||newProduct).drawbacks || ''} onChange={e=>editing?setEditing({...editing,drawbacks:e.target.value}):setNewProduct({...newProduct,drawbacks:e.target.value})}/>
                
                <div style={{background:'#f8fafc',padding:15,borderRadius:10,border:'1px dashed #cbd5e1'}}>
                  <label style={{fontWeight:700,display:'block',marginBottom:6}}>🖼️ একাধিক ছবি আপলোড করুন (৫-৬টি বা তার বেশি একসাথে সিলেক্ট করতে পারবেন):</label>
                  <input style={{fontSize:14}} type="file" accept="image/*" multiple onChange={handleMultipleImagesUpload}/>
                  <small style={{display:'block',color:'#64748b',marginTop:4}}>প্রথম ছবি কাভার ছবি হিসেবে দেখাবে এবং বাকি ছবিগুলো গ্যালারিতে দেখাবে।</small>
                </div>

                <div style={{display:'flex',gap:10}}>
                  <button style={btn()} disabled={busy}>{editing?'পণ্য আপডেট করুন':'নতুন পণ্য যুক্ত করুন'}</button>
                  {editing && <button type="button" style={btn('#64748b')} onClick={()=>setEditing(null)}>বাতিল</button>}
                </div>
              </form>

              <div style={{overflowX:'auto',marginTop:25}}>
                <table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:14}}>
                  <thead><tr style={{background:'#f1f5f9',borderBottom:'2px solid #e2e8f0',color:'#475569'}}><th style={{padding:12}}>পণ্য</th><th style={{padding:12}}>ক্রয়</th><th style={{padding:12}}>বিক্রয়</th><th style={{padding:12}}>স্টক</th><th style={{padding:12}}>অ্যাকশন</th></tr></thead>
                  <tbody>{products.map(p=><tr key={p.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:12,fontWeight:700,display:'flex',alignItems:'center',gap:10}}><img src={p.image_url||''} alt="" style={{width:40,height:40,borderRadius:8,objectFit:'cover'}}/>{p.name}</td>
                    <td style={{padding:12,color:'#ef4444'}}>{money(p.cost)}</td>
                    <td style={{padding:12,color:'#059669'}}>{money(p.price)}</td>
                    <td style={{padding:12}}><button onClick={()=>stockChange(p,-1)} style={{padding:'2px 6px',marginRight:5}}>-</button>{p.stock}<button onClick={()=>stockChange(p,1)} style={{padding:'2px 6px',marginLeft:5}}>+</button></td>
                    <td style={{padding:12}}><button onClick={()=>setEditing(p)} style={{background:'#0284c7',color:'#fff',border:0,padding:'5px 10px',borderRadius:6,cursor:'pointer',marginRight:6}}>এডিট</button><button onClick={()=>deleteProduct(p.id)} style={{background:'#ef4444',color:'#fff',border:0,padding:'5px 10px',borderRadius:6,cursor:'pointer'}}>ডিলিট</button></td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>

            <div style={panel}>
              <h3>⚙️ ওয়েবসাইট, পেমেন্ট ও ওনার সেটিংস</h3>
              <form style={{display:'flex',flexDirection:'column',gap:14,marginTop:15}} onSubmit={saveSettings}>
                <label>ওনারের নাম<input style={inputStyle} value={tempSettings.owner.name} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,name:e.target.value}})}/></label>
                <label>ইমেইল<input style={inputStyle} value={tempSettings.owner.email} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,email:e.target.value}})}/></label>
                <label>ফোন<input style={inputStyle} value={tempSettings.owner.phone} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,phone:e.target.value}})}/></label>
                <label>ঠিকানা<input style={inputStyle} value={tempSettings.owner.address} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,address:e.target.value}})}/></label>
                <label>ওয়েবসাইটের বর্ণনা<textarea style={{...inputStyle,height:70}} value={tempSettings.owner.description} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,description:e.target.value}})}/></label>
                <label>পেমেন্ট পদ্ধতি<input style={inputStyle} value={tempSettings.payment.methodName} onChange={e=>setTempSettings({...tempSettings,payment:{...tempSettings.payment,methodName:e.target.value}})}/></label>
                <label>bKash নম্বর<input style={inputStyle} value={tempSettings.payment.accountNumber} onChange={e=>setTempSettings({...tempSettings,payment:{...tempSettings.payment,accountNumber:e.target.value}})}/></label>
                <label>Logo আপলোড<input style={inputStyle} type="file" accept="image/*"/></label>
                <label>Banner আপলোড<input style={inputStyle} type="file" accept="image/*"/></label>
                <button style={btn('#059669')} disabled={busy}>সব সেটিংস সেভ করুন</button>
              </form>
            </div>

            <div style={panel}>
              <h3>📋 অর্ডার ম্যানেজমেন্ট</h3>
              <div style={{overflowX:'auto',marginTop:15}}>
                <table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:14}}>
                  <thead><tr style={{background:'#f1f5f9',borderBottom:'2px solid #e2e8f0'}}><th style={{padding:12}}>অর্ডার</th><th style={{padding:12}}>ক্রেতা</th><th style={{padding:12}}>মোট</th><th style={{padding:12}}>TrxID</th><th style={{padding:12}}>স্ট্যাটাস</th><th style={{padding:12}}>তারিখ</th></tr></thead>
                  <tbody>{orders.map(o=><tr key={o.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:12,fontWeight:700}}>{o.order_code}</td>
                    <td style={{padding:12}}>{o.customer_name}<br/>{o.phone}<br/>{o.address}</td>
                    <td style={{padding:12,color:'#059669',fontWeight:700}}>{money(o.total)}</td>
                    <td style={{padding:12}}><code>{o.trx_id}</code></td>
                    <td style={{padding:12}}><select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)} style={{padding:6,borderRadius:6}}><option>Pending</option><option>Paid</option><option>Processing</option><option>Shipped</option><option>Completed</option><option>Cancelled</option></select></td>
                    <td style={{padding:12}}>{new Date(o.created_at).toLocaleString('bn-BD')}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>

            <div style={panel}>
              <h3>👥 পার্টনার তথ্য</h3>
              <form style={{display:'flex',gap:10,marginTop:15}} onSubmit={addPartner}>
                <input style={inputStyle} required placeholder="নাম" value={partner.name} onChange={e=>setPartner({...partner,name:e.target.value})}/>
                <input style={inputStyle} required type="email" placeholder="ইমেইল" value={partner.email} onChange={e=>setPartner({...partner,email:e.target.value})}/>
                <button style={btn()}>যুক্ত করুন</button>
              </form>
              <div style={{marginTop:15}}>
                {partners.map(pt=><div key={pt.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:10,background:'#f8fafc',borderRadius:8,marginBottom:8}}>
                  <span><b>{pt.name}</b> — {pt.email} ({pt.role})</span><button onClick={()=>removePartner(pt.id)} style={{background:'#ef4444',color:'#fff',border:0,padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>রিমুভ করুন</button>
                </div>)}
              </div>
            </div>
          </>
          )}
        </section>}
      </main>
    </div>

    <footer style={{background:'#0f172a',color:'#cbd5e1',padding:'50px 20px 30px',marginTop:60,borderTop:'4px solid #38bdf8'}}>
      <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:40}}>
        <div>
          <h3 style={{color:'#38bdf8',marginBottom:15,fontSize:20}}>Friends Bazaar</h3>
          <p style={{fontSize:14,lineHeight:1.7}}>{settings.owner.description}</p>
        </div>
        <div>
          <h4 style={{color:'#fff',marginBottom:15,fontSize:16}}>📍 আমাদের ঠিকানা (Address)</h4>
          <p style={{fontSize:14,lineHeight:1.7}}>{settings.owner.address}</p>
        </div>
        <div>
          <h4 style={{color:'#fff',marginBottom:15,fontSize:16}}>📞 কন্টাক্ট আস (Contact Us)</h4>
          <p style={{fontSize:14,margin:'6px 0'}}>ওনার: <b>{settings.owner.name}</b></p>
          <p style={{fontSize:14,margin:'6px 0'}}>মোবাইল: <b>{settings.owner.phone}</b></p>
          <p style={{fontSize:14,margin:'6px 0'}}>ইমেইল: <b>{settings.owner.email}</b></p>
        </div>
      </div>
      <div style={{textAlign:'center',borderTop:'1px solid #1e293b',marginTop:40,paddingTop:20,fontSize:13,color:'#64748b'}}>
        © {new Date().getFullYear()} Friends Bazaar. All Rights Reserved. Powered by Vercel & Supabase.
      </div>
    </footer>
  </div>;
}
