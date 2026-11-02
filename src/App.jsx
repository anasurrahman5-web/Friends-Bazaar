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
const inputStyle = { padding: 11, borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' };
const btn = (bg='#0f172a') => ({ background:bg, color:'#fff', border:0, padding:'10px 15px', borderRadius:8, cursor:'pointer', fontWeight:700 });
const panel = { background:'#fff', padding:20, borderRadius:14, border:'1px solid #e2e8f0', marginBottom:20 };

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
  const [newProduct, setNewProduct] = useState({ name:'', cost:'', price:'', stock:'', image_url:'' });
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

  async function saveProduct(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      let image_url = editing?.image_url || newProduct.image_url;
      const file = e.currentTarget.querySelector('input[type=file]')?.files?.[0];
      if (file) image_url = await uploadImage(file, 'products');
      const source = editing || newProduct;
      const row = { name:source.name.trim(), cost:Number(source.cost), price:Number(source.price), stock:Number(source.stock), image_url:image_url || null };
      const result = editing
        ? await supabase.from('products').update(row).eq('id', editing.id)
        : await supabase.from('products').insert(row);
      if (result.error) throw result.error;
      setEditing(null); setNewProduct({name:'',cost:'',price:'',stock:'',image_url:''});
      await loadAll(); setNotice('পণ্য সংরক্ষণ হয়েছে।');
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
    <p>প্রজেক্টে <code>.env</code> ফাইলে VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY বসাও। এরপর Supabase SQL Editor-এ <code>supabase/schema.sql</code> চালাও। বিস্তারিত নির্দেশনা README-তে আছে।</p>
  </div>;

  return <div style={{fontFamily:"Inter,Arial,sans-serif",background:'#f8fafc',minHeight:'100vh',color:'#1e293b'}}>
    <nav className="topnav">
      <div className="brand" onClick={()=>setTab('shop')}>{settings.logo ? <img src={settings.logo} alt="Friends Bazar"/> : '🛒'} <span>Friends Bazar</span></div>
      <div className="navbuttons">
        <button style={btn(tab==='shop'?'#38bdf8':'#334155')} onClick={()=>setTab('shop')}>🛍️ শপ</button>
        <button style={btn(tab==='cart'?'#38bdf8':'#334155')} onClick={()=>setTab('cart')}>🛒 কার্ট ({cart.reduce((a,b)=>a+b.qty,0)})</button>
        <button style={btn(tab==='admin'?'#e11d48':'#334155')} onClick={()=>setTab('admin')}>⚙️ অ্যাডমিন</button>
      </div>
    </nav>

    {notice && <div className="notice" onClick={()=>setNotice('')}>{notice}　×</div>}
    <main className="page">
      {tab==='shop' && <>
        <section className="hero" style={{backgroundImage:`linear-gradient(#0f172acc,#1e293bcc),url("${settings.banner}")`}}>
          <h1>স্বাগতম Friends Bazar-এ</h1><p>{settings.owner.description}</p>
        </section>
        <div className="products">
          {products.map(p=><article className="product" key={p.id}>
            <img src={p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'} alt={p.name}/>
            <div className="productbody"><div><h3>{p.name}</h3><strong className="price">{money(p.price)}</strong><p className="stock">{p.stock>0?`স্টক আছে: ${p.stock} টি`:'স্টক আউট'}</p></div>
              <div className="actions"><button style={btn('#0284c7')} disabled={p.stock<1} onClick={()=>addToCart(p)}>কার্টে যোগ</button><button style={btn('#059669')} disabled={p.stock<1} onClick={()=>{addToCart(p);setTab('cart')}}>Buy Now</button></div>
            </div>
          </article>)}
        </div>
      </>}

      {tab==='cart' && <section>
        <h2>আপনার শপিং কার্ট ও পেমেন্ট</h2>
        {success ? <div style={{...panel,textAlign:'center',background:'#d1fae5'}}><h2>অর্ডার গ্রহণ করা হয়েছে!</h2><h3>অর্ডার আইডি: {success}</h3><p>পেমেন্ট যাচাই করে অর্ডার প্রসেস করা হবে।</p><button style={btn('#059669')} onClick={()=>{setSuccess('');setTab('shop')}}>আরও কেনাকাটা করুন</button></div> :
        !cart.length ? <div style={panel}>আপনার কার্ট খালি। <button style={btn('#0284c7')} onClick={()=>setTab('shop')}>শপে ফিরে যান</button></div> :
        <div className="checkoutgrid"><div style={panel}><h3>সিলেক্ট করা পণ্য</h3>{cart.map(x=><div className="cartrow" key={x.id}><div><b>{x.name}</b><p>{money(x.price)} × {x.qty}</p></div><div><button onClick={()=>changeQty(x.id,-1)}>-</button> {x.qty} <button onClick={()=>changeQty(x.id,1)}>+</button></div></div>)}<h3>মোট: {money(cartTotal)}</h3></div>
        <div style={panel}><h3>পেমেন্ট ও ডেলিভারি তথ্য</h3><div className="paybox"><b>{settings.payment.methodName}:</b> {settings.payment.accountNumber}<p>এই নম্বরে Send Money করে TrxID দিন।</p></div>
          <form className="formstack" onSubmit={placeOrder}>
            <input style={inputStyle} required placeholder="আপনার নাম" value={checkout.name} onChange={e=>setCheckout({...checkout,name:e.target.value})}/>
            <input style={inputStyle} required type="tel" placeholder="মোবাইল নম্বর" value={checkout.phone} onChange={e=>setCheckout({...checkout,phone:e.target.value})}/>
            <textarea style={inputStyle} required placeholder="পূর্ণাঙ্গ ঠিকানা" value={checkout.address} onChange={e=>setCheckout({...checkout,address:e.target.value})}/>
            <input style={inputStyle} required placeholder="বিকাশ TrxID" value={checkout.trxId} onChange={e=>setCheckout({...checkout,trxId:e.target.value})}/>
            <button style={btn('#e11d48')} disabled={busy}>{busy?'অপেক্ষা করুন...':`অর্ডার কনফার্ম করুন (${money(cartTotal)})`}</button>
          </form>
        </div></div>}
      </section>}

      {tab==='admin' && <section>
        {!isAdmin ? <div style={{...panel,maxWidth:420,margin:'40px auto',textAlign:'center'}}><h2>🔒 অ্যাডমিন লগইন</h2><p>Supabase Auth-এ তৈরি করা অ্যাডমিন ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।</p>
          <form className="formstack" onSubmit={login}><input style={inputStyle} type="email" required placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/><input style={inputStyle} type="password" required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button style={btn()} disabled={busy}>{busy?'অপেক্ষা করুন...':'লগইন'}</button></form>
        </div> : <>
          <div className="adminhead"><h2>⚙️ কন্ট্রোল প্যানেল</h2><button style={btn('#ef4444')} onClick={logout}>লগআউট</button></div>
          <div className="stats"><div style={panel}>মোট অর্ডার<h2>{orders.length}</h2></div><div style={panel}>মোট বিক্রয়<h2>{money(revenue)}</h2></div><div style={panel}>আনুমানিক লাভ<h2>{money(profit)}</h2></div></div>
          <div style={panel}><h3>🛍️ পণ্য যোগ / এডিট</h3><form className="productform" onSubmit={saveProduct}>
            <input style={inputStyle} required placeholder="পণ্যের নাম" value={(editing||newProduct).name} onChange={e=>editing?setEditing({...editing,name:e.target.value}):setNewProduct({...newProduct,name:e.target.value})}/>
            <input style={inputStyle} required type="number" min="0" placeholder="ক্রয়মূল্য" value={(editing||newProduct).cost} onChange={e=>editing?setEditing({...editing,cost:e.target.value}):setNewProduct({...newProduct,cost:e.target.value})}/>
            <input style={inputStyle} required type="number" min="0" placeholder="বিক্রয়মূল্য" value={(editing||newProduct).price} onChange={e=>editing?setEditing({...editing,price:e.target.value}):setNewProduct({...newProduct,price:e.target.value})}/>
            <input style={inputStyle} required type="number" min="0" placeholder="স্টক" value={(editing||newProduct).stock} onChange={e=>editing?setEditing({...editing,stock:e.target.value}):setNewProduct({...newProduct,stock:e.target.value})}/>
            <input style={inputStyle} type="file" accept="image/*"/>
            <button style={btn()} disabled={busy}>{editing?'আপডেট':'পণ্য যুক্ত করুন'}</button>
            {editing && <button type="button" style={btn('#64748b')} onClick={()=>setEditing(null)}>বাতিল</button>}
          </form>
          <div className="tablewrap"><table><thead><tr><th>পণ্য</th><th>ক্রয়</th><th>বিক্রয়</th><th>স্টক</th><th>অ্যাকশন</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.name}</td><td>{money(p.cost)}</td><td>{money(p.price)}</td><td><button onClick={()=>stockChange(p,-1)}>-</button> {p.stock} <button onClick={()=>stockChange(p,1)}>+</button></td><td><button onClick={()=>setEditing(p)}>এডিট</button> <button onClick={()=>deleteProduct(p.id)}>ডিলিট</button></td></tr>)}</tbody></table></div></div>

          <div style={panel}><h3>⚙️ ওয়েবসাইট, পেমেন্ট ও ওনার সেটিংস</h3><form className="formstack" onSubmit={saveSettings}>
            <label>ওনারের নাম<input style={inputStyle} value={tempSettings.owner.name} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,name:e.target.value}})}/></label>
            <label>ইমেইল<input style={inputStyle} value={tempSettings.owner.email} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,email:e.target.value}})}/></label>
            <label>ফোন<input style={inputStyle} value={tempSettings.owner.phone} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,phone:e.target.value}})}/></label>
            <label>ঠিকানা<input style={inputStyle} value={tempSettings.owner.address} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,address:e.target.value}})}/></label>
            <label>ওয়েবসাইটের বর্ণনা<textarea style={inputStyle} value={tempSettings.owner.description} onChange={e=>setTempSettings({...tempSettings,owner:{...tempSettings.owner,description:e.target.value}})}/></label>
            <label>পেমেন্ট পদ্ধতি<input style={inputStyle} value={tempSettings.payment.methodName} onChange={e=>setTempSettings({...tempSettings,payment:{...tempSettings.payment,methodName:e.target.value}})}/></label>
            <label>bKash নম্বর<input style={inputStyle} value={tempSettings.payment.accountNumber} onChange={e=>setTempSettings({...tempSettings,payment:{...tempSettings.payment,accountNumber:e.target.value}})}/></label>
            <label>Logo আপলোড<input style={inputStyle} type="file" accept="image/*"/></label><label>Banner আপলোড<input style={inputStyle} type="file" accept="image/*"/></label>
            <button style={btn('#059669')} disabled={busy}>সব সেটিংস সেভ করুন</button>
          </form></div>

          <div style={panel}><h3>📋 অর্ডার ম্যানেজমেন্ট</h3><div className="tablewrap"><table><thead><tr><th>অর্ডার</th><th>ক্রেতা</th><th>মোট</th><th>TrxID</th><th>স্ট্যাটাস</th><th>তারিখ</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.order_code}</td><td>{o.customer_name}<br/>{o.phone}<br/>{o.address}</td><td>{money(o.total)}</td><td>{o.trx_id}</td><td><select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)}><option>Pending</option><option>Paid</option><option>Processing</option><option>Shipped</option><option>Completed</option><option>Cancelled</option></select></td><td>{new Date(o.created_at).toLocaleString('bn-BD')}</td></tr>)}</tbody></table></div></div>

          <div style={panel}><h3>👥 পার্টনার তথ্য</h3><form className="partnerform" onSubmit={addPartner}><input style={inputStyle} required placeholder="নাম" value={partner.name} onChange={e=>setPartner({...partner,name:e.target.value})}/><input style={inputStyle} required type="email" placeholder="ইমেইল" value={partner.email} onChange={e=>setPartner({...partner,email:e.target.value})}/><button style={btn()}>যুক্ত করুন</button></form>
            {partners.map(pt=><div className="cartrow" key={pt.id}><span>{pt.name} — {pt.email} ({pt.role})</span><button onClick={()=>removePartner(pt.id)}>রিমুভ</button></div>)}
            <p className="smallnote">এখানে পার্টনারের তথ্য সংরক্ষিত হয়। কাউকে অ্যাডমিন অ্যাক্সেস দিতে হলে Supabase Auth-এ তার ইউজার তৈরি করে profiles টেবিলে admin role দিতে হবে।</p>
          </div>
        </>}
      </section>}
    </main>
    <footer><div><h3>Friends Bazar</h3><p>{settings.owner.description}</p></div><div><h4>📍 ঠিকানা</h4><p>{settings.owner.address}</p></div><div><h4>📞 যোগাযোগ</h4><p>{settings.owner.name}</p><p>{settings.owner.phone}</p><p>{settings.owner.email}</p></div><small>© {new Date().getFullYear()} Friends Bazar. All Rights Reserved. Powered by Vercel.</small></footer>
  </div>;
}
