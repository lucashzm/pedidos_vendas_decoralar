async function gerarPDF(idPedido){
 const { data: pedido, error } = await db
  .from('pedidos')
  .select('*')
  .eq('id', idPedido)
  .single();

 if(error) throw error;

 const { data: itens } = await db
  .from('pedido_itens')
  .select('*')
  .eq('pedido_id', idPedido);

 const { data: cliente } = await db
  .from('clientes')
  .select('*')
  .eq('id', pedido.cliente_id)
  .single();

 const { jsPDF } = window.jspdf;
 const doc = new jsPDF();

 let y = 20;

 doc.setFontSize(18);
 doc.text('DECORALAR', 20, y);

 y += 12;
 doc.setFontSize(14);
 doc.text(`PEDIDO Nº ${pedido.numero_pedido}`, 20, y);

 y += 15;
 doc.setFontSize(11);
 doc.text(`Cliente: ${cliente?.nome || ''}`, 20, y);
 y += 7;
 doc.text(`Telefone: ${cliente?.telefone || ''}`, 20, y);
 y += 7;
 doc.text(`Email: ${cliente?.email || ''}`, 20, y);

 y += 12;
 doc.text('Produtos:', 20, y);

 itens?.forEach(item => {
  y += 7;
  doc.text(`${item.produto} | Qtd: ${item.quantidade} | ${formatarBRL(item.valor_unitario)}`, 20, y);
 });

 y += 12;
 doc.text(`Frete: ${formatarBRL(pedido.frete || 0)}`, 20, y);
 y += 7;
 doc.text(`Total: ${formatarBRL(pedido.valor_total || 0)}`, 20, y);
 y += 7;
 doc.text(`Entrega prevista: ${pedido.previsao_entrega || ''}`, 20, y);

 doc.save(`Pedido_${pedido.numero_pedido}.pdf`);
}
