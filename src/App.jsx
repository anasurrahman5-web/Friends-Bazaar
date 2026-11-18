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
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td style={{padding:10,display:'flex',gap:6}}>
                                <button onClick={()=>downloadInvoice(o)} style={{padding:'6px 10px',background:'#0284c7',color:'#fff',border:0,borderRadius:6,cursor:'pointer'}}>📥</button>
                                <button onClick={()=>deleteOrder(o)} style={{padding:'6px 10px',background:'#dc2626',color:'#fff',border:0,borderRadius:6,cursor:'pointer'}}>🗑️</button>
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

      <footer style={{background:'#0f172a',color:'#94a3b8',padding:'25px 30px',textAlign:'center',marginTop:40}}>
        <p style={{margin:0}}>&copy; {new Date().getFullYear()} Friends Bazaar. All rights reserved.</p>
        <p style={{margin:'5px 0 0 0',fontSize:13}}>প্রোপ্রাইটর: {settings.owner.name} | ফোন: {settings.owner.phone}</p>
      </footer>
    </div>
  );
}
