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
 const margem = 20;
 let y = 20;

 function formatarDataBR(data){
  if(!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
 }

 function titulo(texto){
  doc.setFont('helvetica','bold');
  doc.setFontSize(12);
  doc.text(texto,margem,y);
  y += 6;
  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
 }

 function linha(){
  doc.line(margem,y,190,y);
  y += 8;
 }

 doc.setFont('helvetica','bold');
 doc.setFontSize(24);
 doc.text('DECORALAR',105,y,{align:'center'});

 y += 10;
 doc.setFontSize(16);
 doc.text('PEDIDO DE VENDA',105,y,{align:'center'});

 y += 12;
 doc.setFontSize(12);
 doc.text(`Pedido Nº ${pedido.numero_pedido}`,margem,y);
 doc.text(`Data entrega: ${formatarDataBR(pedido.previsao_entrega)}`,120,y);
 linha();

 titulo('CLIENTE');
 doc.text(`Nome: ${cliente?.nome || ''}`,margem,y); y += 6;
 doc.text(`Telefone: ${cliente?.telefone || ''}`,margem,y); y += 6;
 doc.text(`Email: ${cliente?.email || ''}`,margem,y);
 y += 12;

 titulo('ENDEREÇO DE ENTREGA');
 doc.text(pedido.endereco || '',margem,y); y += 6;
 doc.text(`Referência: ${pedido.referencia || ''}`,margem,y);
 y += 12;

 titulo('PRODUTOS');
 doc.setFont('helvetica','bold');
 doc.text('Produto',margem,y);
 doc.text('Qtd',140,y);
 doc.text('Valor',160,y);
 doc.setFont('helvetica','normal');
 y += 5;
 linha();

 itens?.forEach(item=>{
  doc.setFont('helvetica','bold');
  doc.text(item.produto.substring(0,55),margem,y);
  doc.setFont('helvetica','normal');
  doc.text(String(item.quantidade),140,y);
  doc.text(formatarBRL(item.valor_unitario),160,y);
  y += 8;
 });

 linha();
 titulo('RESUMO FINANCEIRO');
 doc.text(`Forma de pagamento: ${pedido.forma_pagamento || ''}`,margem,y); y += 7;
 doc.text(`Frete: ${formatarBRL(pedido.frete || 0)}`,margem,y); y += 10;

 doc.setFont('helvetica','bold');
 doc.setFontSize(15);
 doc.text(`TOTAL DO PEDIDO: ${formatarBRL(pedido.valor_total || 0)}`,margem,y);
 y += 18;

 doc.setFont('helvetica','normal');
 doc.setFontSize(10);
 doc.text(`Previsão de entrega: ${formatarDataBR(pedido.previsao_entrega)}`,margem,y);

 y += 25;
 doc.line(55,y,155,y);
 y += 7;
 doc.text('Assinatura do Cliente / Recebedor',55,y);

 y += 15;
 doc.setFontSize(9);
 doc.text('Documento de pedido de venda - Decoralar',105,y,{align:'center'});

 doc.save(`Pedido_${pedido.numero_pedido}.pdf`);
}
