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

 function formatarDataBR(data){
  if(!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
 }

 let y = 20;
 const margem = 20;

 doc.setFontSize(22);
 doc.text('DECORALAR', 105, y, { align:'center' });

 y += 10;
 doc.setFontSize(15);
 doc.text('PEDIDO DE VENDA', 105, y, { align:'center' });

 y += 15;
 doc.setFontSize(12);
 doc.text(`Pedido Nº ${pedido.numero_pedido}`, margem, y);
 doc.text(`Entrega: ${formatarDataBR(pedido.previsao_entrega)}`, 130, y);

 y += 10;
 doc.line(margem, y, 190, y);

 y += 10;
 doc.setFontSize(12);
 doc.text('CLIENTE', margem, y);
 doc.setFontSize(10);
 y += 7;
 doc.text(`Nome: ${cliente?.nome || ''}`, margem, y);
 y += 6;
 doc.text(`Telefone: ${cliente?.telefone || ''}`, margem, y);
 y += 6;
 doc.text(`Email: ${cliente?.email || ''}`, margem, y);

 y += 12;
 doc.setFontSize(12);
 doc.text('ENTREGA', margem, y);
 doc.setFontSize(10);
 y += 7;
 doc.text(pedido.endereco || '', margem, y);
 y += 6;
 doc.text(`Referência: ${pedido.referencia || ''}`, margem, y);

 y += 12;
 doc.setFontSize(12);
 doc.text('PRODUTOS', margem, y);
 y += 7;
 doc.setFontSize(10);
 doc.line(margem, y, 190, y);

 y += 7;
 doc.text('Produto', margem, y);
 doc.text('Qtd', 140, y);
 doc.text('Valor', 160, y);
 y += 5;
 doc.line(margem, y, 190, y);

 itens?.forEach(item => {
  y += 7;
  doc.text(item.produto.substring(0,55), margem, y);
  doc.text(String(item.quantidade), 140, y);
  doc.text(formatarBRL(item.valor_unitario), 160, y);
 });

 y += 12;
 doc.line(margem, y, 190, y);
 y += 10;
 doc.setFontSize(12);
 doc.text('RESUMO', margem, y);
 doc.setFontSize(10);
 y += 7;
 doc.text(`Frete: ${formatarBRL(pedido.frete || 0)}`, margem, y);
 y += 7;
 doc.setFontSize(13);
 doc.text(`TOTAL: ${formatarBRL(pedido.valor_total || 0)}`, margem, y);

 y += 15;
 doc.setFontSize(10);
 doc.text('Obrigado pela preferência!', 105, y, { align:'center' });

 doc.save(`Pedido_${pedido.numero_pedido}.pdf`);
}
