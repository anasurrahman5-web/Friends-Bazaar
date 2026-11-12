import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase';

const DEFAULT_SETTINGS = {
  owner: {
    name: 'Md. Anisur Rahman',
    email: 'anasurrahman5@gmail.com',
    phone: '01722023943',
    address: 'আশুগঞ্জ, ব্রাহ্মণবাড়িয়া, বাংলাদেশ',
    description: 'খাঁটি, নিরাপদ ও প্রিমিয়াম কোয়ালিটি পণ্য অর্ডার করুন খুব সহজেই ঘরে বসে।'
  },
  payment: { methodName: 'বিকাশ পার্সোনাল', accountNumber: '01722023943' },
  logo: '',
  banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  dashboardBg: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80'
};

const money = n => `৳ ${Number(n || 0).toLocaleString('en-BD')}`;
const inputStyle = { padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontSize: '15px' };
const btn = (bg='#0f172a') => ({ background:bg, color:'#fff', border:0, padding:'12px 18px', borderRadius:10, cursor:'pointer', fontWeight:700 });
const panel = { background:'#fff', padding:25, borderRadius:16, border:'1px solid #e2e8f0', marginBottom:25, boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' };

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
  const [checkout, setCheckout] = useState({ name:'', phone:'', address:'', paymentMethod:'Cash on Delivery', trxId:'' });
  const [lastOrder, setLastOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', cost: '', price: '', stock: '', description: '', benefits: '', drawbacks: '', image_url: '', images: [] });
  const [editing, setEditing] = useState(null);
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
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
    if (error) setNotice('লগইন হয়নি: ' + error.message);
    else { setPassword(''); setNotice('লগইন সফল হয়েছে।'); }
  }

  async function logout() {
    await supabase.auth.signOut();
    setOrders([]); setPartners([]); setAdminRole(''); setTab('shop');
  }

  function addToCart(p) {
    if (p.stock < 1) return setNotice('দুঃখিত, পণ্যটি বর্তমানে স্টকে নেই।');
    const found = cart.find(x => x.id === p.id);
    if (found && found.qty >= p.stock) return setNotice('স্টকের অতিরিক্ত পণ্য কার্টে যোগ করা যাবে না।');
    setCart(old => found ? old.map(x => x.id === p.id ? {...x, qty:x.qty+1} : x) : [...old, {...p, qty:1}]);
  }

  function changeQty(id, delta) {
    setCart(old => old.map(x => x.id === id ? {...x, qty:Math.max(0, Math.min(Number(x.stock), x.qty+delta))} : x).filter(x => x.qty > 0));
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!cart.length) return;

    if (checkout.phone.length > 11) {
      return setNotice('ফোন নম্বর ১১ ডিজিটের বেশি হতে পারবে না।');
    }

    if (checkout.paymentMethod === 'bKash' && !checkout.trxId.trim()) {
      return setNotice('বিকাশ পেমেন্টের জন্য ট্রানজেকশন আইডি (TrxID) দিতে হবে।');
    }

    setBusy(true);
    const items = cart.map(x => ({ product_id: x.id, qty: x.qty }));
    
    const { data, error } = await supabase.rpc('create_public_order', {
      p_customer_name: checkout.name.trim(),
      p_phone: checkout.phone.trim(),
      p_address: checkout.address.trim(),
      p_payment_method: checkout.paymentMethod,
      p_trx_id: checkout.paymentMethod === 'bKash' ? checkout.trxId.trim() : 'Cash on Delivery',
      p_items: items
    });
    
    setBusy(false);
    if (error) { setNotice('অর্ডার সাবমিট হয়নি: ' + error.message); return; }
    
    const newOrderId = data?.order_id;
    if (newOrderId) {
      const fetchedOrder = await supabase.from('orders').select('*, order_items(*, products(*))').eq('id', newOrderId).single();
      if (!fetchedOrder.error) setLastOrder(fetchedOrder.data);
    }

    setCart([]); setCheckout({ name:'', phone:'', address:'', paymentMethod:'Cash on Delivery', trxId:'' });
    await loadAll();
  }

  async function uploadImage(file, path) {
    if (!file) return '';
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `${path}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
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
      setNotice('ছবি সফলভাবে আপলোড হয়েছে!');
    } catch (err) { setNotice(err.message); }
    setBusy(false);
  }

  async function saveProduct(e) {
    e.preventDefault(); setBusy(true);
    try {
      const source = editing || newProduct;
      const allImages = source.images?.length ? source.images : (source.image_url ? [source.image_url] : []);
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
      const result = editing ? await supabase.from('products').update(row).eq('id', editing.id) : await supabase.from('products').insert(row);
      if (result.error) throw result.error;
      setEditing(null); 
      setNewProduct({name:'', cost:'', price:'', stock:'', description:'', benefits:'', drawbacks:'', image_url:'', images:[]});
      await loadAll(); 
      setNotice('পণ্য সফলভাবে সংরক্ষিত হয়েছে।');
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
      setNotice('ওয়েবসাইট সেটিংস সফলভাবে আপডেট করা হয়েছে!');
    } catch(err) { setNotice(err.message); }
    setBusy(false);
  }

  async function updateOrderStatus(orderId, status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (!error) await loadAll();
  }

  async function addPartner(e) {
    e.preventDefault();
    if (!newPartnerEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('partners').insert({ name: 'Partner', email: newPartnerEmail.trim() });
    setBusy(false);
    if (error) {
      setNotice('পার্টনার যোগ করা যায়নি: ' + error.message);
    } else {
      setNewPartnerEmail('');
      setNotice('পার্টনার সফলভাবে যুক্ত করা হয়েছে!');
      await loadAll();
    }
  }

  async function deletePartner(id) {
    if (!confirm('পার্টনারকে তালিকা থেকে সরাতে চান?')) return;
    await supabase.from('partners').delete().eq('id', id);
    await loadAll();
  }

  function downloadInvoice(order) {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
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
              <h2 style="margin:0; color:#0f172a;">Friends Bazaar</h2>
              <p style="margin:5px 0 0 0; font-size:13px; color:#64748b;">${settings.owner.address} | ফোন: ${settings.owner.phone}</p>
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
            ${order.trx_id !== 'Cash on Delivery' ? `<p style="margin:4px 0;"><b>বিকাশ TrxID:</b> ${order.trx_id}</p>` : ''}
            <p style="margin:4px 0;"><b>অর্ডার স্ট্যাটাস:</b> <span style="color:${order.status==='Cancelled'?'#dc2626':'#059669'}">${order.status}</span></p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>পণ্যের নাম</th>
                <th>পরিমাণ</th>
                <th>মূল্য</th>
                <th>মোট</th>
              </tr>
            </thead>
            <tbody>
              ${order.order_items.map(item => `
                <tr>
                  <td>${item.products?.name || 'পণ্য'}</td>
                  <td>${item.qty} টি</td>
                  <td>৳ ${Number(item.price).toLocaleString('en-BD')}</td>
                  <td>৳ ${(item.price * item.qty).toLocaleString('en-BD')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            মোট প্রদেয়: ৳ ${Number(order.total).toLocaleString('en-BD')}
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
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  return (
    <div style={{fontFamily:"Inter,Arial,sans-serif",background:'#f8fafc',minHeight:'100vh',color:'#1e293b',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
      <div>
        <nav style={{background:'#0f172a',color:'#fff',padding:'15px 30px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
          <div onClick={()=>setTab('shop')} style={{cursor:'pointer',fontSize:24,fontWeight:900,color:'#38bdf8',display:'flex',alignItems:'center',gap:10}}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{height:35,width:35,borderRadius:'50%',objectFit:'cover'}}/>}
            Friends Bazaar
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button style={btn(tab==='shop'?'#38bdf8':'#334155')} onClick={()=>setTab('shop')}>🛍️ শপ</button>
            <button style={btn(tab==='cart'?'#38bdf8':'#334155')} onClick={()=>setTab('cart')}>🛒 কার্ট ({cart.reduce((a,b)=>a+b.qty,0)})</button>
            <button style={btn(tab==='admin'?'#e11d48':'#334155')} onClick={()=>setTab('admin')}>⚙️ অ্যাডমিন</button>
          </div>
        </nav>

        {notice && <div onClick={()=>setNotice('')} style={{background:'#38bdf8',color:'#0f172a',padding:12,textAlign:'center',cursor:'pointer',fontWeight:600}}>{notice} ✕</div>}
        
        <main style={{maxWidth:1200,margin:'30px auto',padding:'0 20px'}}>
          {tab==='shop' && (
            <div>
              <section style={{backgroundImage:`linear-gradient(#0f172acc,#1e293bcc),url("${settings.banner}")`,backgroundSize:'cover',backgroundPosition:'center',padding:'80px 20px',borderRadius:20,textAlign:'center',color:'#fff',marginBottom:40,boxShadow:'0 10px 25px rgba(0,0,0,0.1)'}}>
                <h1 style={{fontSize:42,color:'#38bdf8',marginBottom:15}}>স্বাগতম Friends Bazaar-এ</h1>
                <p style={{fontSize:18,maxWidth:700,margin:'0 auto',lineHeight:1.6}}>{settings.owner.description}</p>
              </section>
              
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:25}}>
                {products.map(p=>(
                  <div key={p.id} style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.04)',display:'flex',flexDirection:'column',border:'1px solid #e2e8f0',transition:'transform 0.2s'}}>
                    <div onClick={()=>{ setSelectedProduct(p); setActiveImageIndex(0); }} style={{cursor:'pointer',height:220,background:'#f1f5f9',position:'relative'}}>
                      <img src={p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      <span style={{position:'absolute',top:12,right:12,background:p.stock>0?'#059669':'#dc2626',color:'#fff',padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>
                        {p.stock>0 ? `স্টক: ${p.stock}` : 'স্টক আউট'}
                      </span>
                    </div>
                    <div style={{padding:20,flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                      <div>
                        <h3 onClick={()=>{ setSelectedProduct(p); setActiveImageIndex(0); }} style={{cursor:'pointer',fontSize:18,marginBottom:8,color:'#0f172a'}}>{p.name}</h3>
                        <strong style={{color:'#059669',fontSize:22}}>{money(p.price)}</strong>
                      </div>
                      <div style={{display:'flex',gap:10,marginTop:20}}>
                        <button style={{...btn('#0284c7'),flex:1}} disabled={p.stock<1} onClick={()=>addToCart(p)}>কার্টে যোগ</button>
                        <button style={{...btn('#059669'),flex:1}} disabled={p.stock<1} onClick={()=>{addToCart(p);setTab('cart')}}>অর্ডার করুন</button>
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
                    <strong style={{color:'#059669',fontSize:26}}>{money(selectedProduct.price)}</strong>
                    <p style={{fontSize:14,color:selectedProduct.stock>0?'#059669':'#dc2626',fontWeight:600,marginTop:5}}>
                      {selectedProduct.stock>0 ? `উপলব্ধ স্টক: ${selectedProduct.stock} টি` : 'পণ্যটি স্টকে নেই'}
                    </p>

                    <div style={{textAlign:'center',margin:'20px 0',position:'relative'}}>
                      <img 
                        src={(selectedProduct.images && selectedProduct.images[activeImageIndex]) || selectedProduct.image_url} 
                        alt="" 
                        onClick={()=>setIsZoomed(true)} 
                        style={{maxHeight:280,width:'100%',objectFit:'contain',borderRadius:10,cursor:'zoom-in',border:'1px solid #e2e8f0'}}
                        title="ফটো জুম করতে ক্লিক করুন"
                      />
                      <p style={{fontSize:12,color:'#64748b',marginTop:5}}>বড় করে দেখতে ছবিতে ক্লিক করুন</p>
                      
                      {selectedProduct.images?.length > 1 && (
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12,overflowX:'auto',paddingBottom:5}}>
                          {selectedProduct.images.map((img, idx)=>(
                            <img key={idx} src={img} alt="" onClick={()=>setActiveImageIndex(idx)} style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:activeImageIndex===idx?'2px solid #0284c7':'2px solid #cbd5e1',cursor:'pointer'}}/>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{display:'flex',flexDirection:'column',gap:12,background:'#f8fafc',padding:15,borderRadius:12,marginTop:15}}>
                      <p style={{margin:0}}><b>পণ্যের বিবরণ:</b> {selectedProduct.description || 'বিবরণ দেওয়া হয়নি।'}</p>
                      <p style={{margin:0}}><b>উপকারিতা:</b> {selectedProduct.benefits || 'তথ্য নেই।'}</p>
                      <p style={{margin:0}}><b>সতর্কতা/বিশেষ দ্রষ্টব্য:</b> {selectedProduct.drawbacks || 'তথ্য নেই।'}</p>
                    </div>

                    <button style={{...btn('#059669'),width:'100%',marginTop:20,padding:14,fontSize:16}} disabled={selectedProduct.stock<1} onClick={()=>{addToCart(selectedProduct);setSelectedProduct(null);setTab('cart');}}>
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
                  <h3 style={{margin:'0 0 5px 0'}}>🎉 অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</h3>
                  <p style={{margin:'0 0 15px 0'}}>অর্ডার আইডি: <b>{lastOrder.order_code}</b></p>
                  <button style={btn('#0284c7')} onClick={()=>downloadInvoice(lastOrder)}>📥 অর্ডার ইনভয়েস ডাউনলোড/প্রিন্ট করুন</button>
                </div>
              ) : null}

              {!cart.length ? (
                <div style={{textAlign:'center',padding:'40px 0'}}>
                  <p style={{fontSize:18,color:'#64748b'}}>আপনার কার্ট খালি রয়েছে।</p>
                  <button style={{...btn('#0284c7'),marginTop:10}} onClick={()=>setTab('shop')}>শপে ফিরে যান</button>
                </div>
              ) : (
                <div>
                  <div style={{marginBottom:20}}>
                    {cart.map(x=>(
                      <div key={x.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #e2e8f0'}}>
                        <div>
                          <h4 style={{margin:0}}>{x.name}</h4>
                          <span style={{fontSize:14,color:'#64748b'}}>{money(x.price)} × {x.qty}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <strong>{money(x.price * x.qty)}</strong>
                          <div style={{display:'flex',gap:5,alignItems:'center'}}>
                            <button onClick={()=>changeQty(x.id,-1)} style={{padding:'4px 10px',background:'#cbd5e1',border:0,borderRadius:6,cursor:'pointer',fontWeight:700}}>-</button>
                            <span>{x.qty}</span>
                            <button onClick={()=>changeQty(x.id,1)} style={{padding:'4px 10px',background:'#cbd5e1',border:0,borderRadius:6,cursor:'pointer',fontWeight:700}}>+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:20,fontWeight:700,marginTop:20}}>
                      <span>মোট প্রদেয়:</span>
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
                    
                    {/* ফোন নম্বর (সর্বোচ্চ ১১ ডিজিট) */}
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

          {tab==='admin' && (
            <div>
              {!isAdmin ? (
                <div style={{maxWidth:400,margin:'40px auto',...panel,textAlign:'center'}}>
                  <h2>🔐 অ্যাডমিন / পার্টনার লগইন</h2>
                  <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:15,marginTop:20}}>
                    <input style={inputStyle} type="email" required placeholder="ইমেইল অ্যাড্রেস" value={email} onChange={e=>setEmail(e.target.value)}/>
                    <input style={inputStyle} type="password" required placeholder="পাসওয়ার্ড" value={password} onChange={e=>setPassword(e.target.value)}/>
                    <button style={btn()}>লগইন করুন</button>
                  </form>
                </div>
              ) : (
                <div style={{backgroundImage:`linear-gradient(#f8fafcee,#f8fafcee),url("${settings.dashboardBg}")`,backgroundSize:'cover',padding:20,borderRadius:20}}>
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
                            <div style={{background:'#10b981',width:`${Math.min(100, (analytics.dailyP / 5000) * 100)}%`,height:'100%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span>সাপ্তাহিক গ্রোথ (Weekly Growth)</span>
                            <span style={{fontWeight:700}}>{money(analytics.weeklyP)}</span>
                          </div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#3b82f6',width:`${Math.min(100, (analytics.weeklyP / 30000) * 100)}%`,height:'100%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span>মাসিক গ্রোথ (Monthly Growth)</span>
                            <span style={{fontWeight:700}}>{money(analytics.monthlyP)}</span>
                          </div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#8b5cf6',width:`${Math.min(100, (analytics.monthlyP / 120000) * 100)}%`,height:'100%'}}></div>
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
                            <div style={{background:'#059669',width:`${Math.min(100, (analytics.monthlyS / 250000) * 100)}%`,height:'100%'}}></div>
                          </div>
                        </div>
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                            <span style={{fontWeight:600}}>চলতি বছরের মোট সেলস (Yearly Sales)</span>
                            <span style={{fontWeight:700, color:'#0284c7'}}>{money(analytics.yearlyS)}</span>
                          </div>
                          <div style={{background:'#e2e8f0',height:12,borderRadius:6,overflow:'hidden'}}>
                            <div style={{background:'#0284c7',width:`${Math.min(100, (analytics.yearlyS / 3000000) * 100)}%`,height:'100%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* অর্ডার লিস্ট ও ইনভয়েস ম্যানেজমেন্ট */}
                  <div style={panel}>
                    <h3>📦 কাস্টমার অর্ডারসমূহ ও ইনভয়েস ম্যানেজমেন্ট</h3>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',marginTop:10,fontSize:14}}>
                        <thead>
                          <tr style={{background:'#f1f5f9',textAlign:'left'}}>
                            <th style={{padding:10}}>অর্ডার কোড</th>
                            <th style={{padding:10}}>গ্রাহক</th>
                            <th style={{padding:10}}>ঠিকানা ও ফোন</th>
                            <th style={{padding:10}}>পেমেন্ট মাধ্যম</th>
                            <th style={{padding:10}}>মোট টাকা</th>
                            <th style={{padding:10}}>স্ট্যাটাস</th>
                            <th style={{padding:10}}>ইনভয়েস</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o=>(
                            <tr key={o.id} style={{borderBottom:'1px solid #e2e8f0', background: o.status==='Cancelled' ? '#fef2f2' : 'transparent'}}>
                              <td style={{padding:10,fontWeight:700}}>{o.order_code}</td>
                              <td style={{padding:10}}>{o.customer_name}</td>
                              <td style={{padding:10}}>{o.phone}<br/>{o.address}</td>
                              <td style={{padding:10}}>
                                {o.trx_id === 'Cash on Delivery' ? <span style={{color:'#d97706', fontWeight:600}}>COD (নগদ)</span> : <span>বিকাশ<br/><small>Trx: {o.trx_id}</small></span>}
                              </td>
                              <td style={{padding:10,fontWeight:700,color:'#059669'}}>{money(o.total)}</td>
                              <td style={{padding:10}}>
                                <select value={o.status} onChange={e=>updateOrderStatus(o.id, e.target.value)} style={{padding:6,borderRadius:6,fontWeight:600,color:o.status==='Cancelled'?'#dc2626':'#1e293b'}}>
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled (বাতিল)</option>
                                </select>
                              </td>
                              <td style={{padding:10}}>
                                <button onClick={()=>downloadInvoice(o)} style={{padding:'6px 12px',background:'#0284c7',color:'#fff',border:0,borderRadius:6,cursor:'pointer',fontWeight:600}}>📥 প্রিন্ট</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <footer style={{background:'#0f172a',color:'#cbd5e1',padding:40,textAlign:'center',marginTop:60}}>
        <div style={{maxWidth:800,margin:'0 auto'}}>
          <h3 style={{color:'#38bdf8',marginBottom:10}}>Friends Bazaar</h3>
          <p style={{lineHeight:1.6,marginBottom:15}}>{settings.owner.description}</p>
          <p style={{margin:5}}>📍 {settings.owner.address} | 📞 ফোন: {settings.owner.phone} | ✉️ {settings.owner.email}</p>
          <small style={{display:'block',marginTop:20,color:'#64748b'}}>© 2026 Friends Bazaar. All rights reserved.</small>
        </div>
      </footer>
    </div>
  );
}
