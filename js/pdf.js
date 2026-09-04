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
  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
 }

 doc.setFont('helvetica','bold');
 doc.setFontSize(22);
 doc.text('DECORALAR',105,y,{align:'center'});

 y += 10;
 doc.setFontSize(15);
 doc.text('PEDIDO DE VENDA',105,y,{align:'center'});

 y += 15;
 doc.setFontSize(12);
 doc.text(`Pedido Nº ${pedido.numero_pedido}`,margem,y);
 doc.text(`Entrega: ${formatarDataBR(pedido.previsao_entrega)}`,130,y);
 doc.line(margem,y+5,190,y+5);

 y += 15;
 titulo('CLIENTE');
 y += 7;
 doc.text(`Nome: ${cliente?.nome || ''}`,margem,y);
 y += 6;
 doc.text(`Telefone: ${cliente?.telefone || ''}`,margem,y);
 y += 6;
 doc.text(`Email: ${cliente?.email || ''}`,margem,y);

 y += 12;
 titulo('ENDEREÇO DE ENTREGA');
 y += 7;
 doc.text(pedido.endereco || '',margem,y);
 y += 6;
 doc.text(`Referência: ${pedido.referencia || ''}`,margem,y);

 y += 12;
 titulo('PRODUTOS');
 y += 7;
 doc.line(margem,y,190,y);
 y += 7;
 doc.setFont('helvetica','bold');
 doc.text('Produto',margem,y);
 doc.text('Qtd',140,y);
 doc.text('Valor',160,y);
 doc.setFont('helvetica','normal');

 itens?.forEach(item=>{
  y += 8;
  doc.setFont('helvetica','bold');
  doc.text(item.produto.substring(0,55),margem,y);
  doc.setFont('helvetica','normal');
  doc.text(String(item.quantidade),140,y);
  doc.text(formatarBRL(item.valor_unitario),160,y);
 });

 y += 12;
 doc.line(margem,y,190,y);
 y += 10;
 titulo('RESUMO FINANCEIRO');
 y += 7;
 doc.text(`Forma de pagamento: ${pedido.forma_pagamento || ''}`,margem,y);
 y += 7;
 doc.text(`Frete: ${formatarBRL(pedido.frete || 0)}`,margem,y);
 y += 9;
 doc.setFont('helvetica','bold');
 doc.setFontSize(14);
 doc.text(`TOTAL DO PEDIDO: ${formatarBRL(pedido.valor_total || 0)}`,margem,y);

 y += 18;
 doc.setFont('helvetica','normal');
 doc.setFontSize(10);
 doc.text(`Previsão de entrega: ${formatarDataBR(pedido.previsao_entrega)}`,margem,y);

 y += 30;
 doc.line(20,y,90,y);
 doc.line(120,y,190,y);
 y += 7;
 doc.text('Assinatura do Cliente',20,y);
 doc.text('Responsável pela Entrega',120,y);

 doc.save(`Pedido_${pedido.numero_pedido}.pdf`);
}
