async function gerarPDF(idPedido){
 const { data: pedido, error } = await db.from('pedidos').select('*').eq('id', idPedido).single();
 if(error) throw error;

 const { data: itens } = await db.from('pedido_itens').select('*').eq('pedido_id', idPedido);
 const { data: cliente } = await db.from('clientes').select('*').eq('id', pedido.cliente_id).single();

 const { jsPDF } = window.jspdf;
 const doc = new jsPDF();
 const margem = 20;
 let y = 22;

 function formatarDataBR(data){
  if(!data) return '';
  const [ano,mes,dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
 }

 function titulo(texto){
  doc.setFont('helvetica','bold');
  doc.setFontSize(12);
  doc.text(texto,margem,y);
  y += 9;
 }

 function linha(){
  doc.line(margem,y,190,y);
  y += 10;
 }

 doc.setFont('helvetica','bold');
 doc.setFontSize(26);
 doc.text('DECORALAR',105,y,{align:'center'});
 y += 12;
 doc.setFontSize(17);
 doc.text('PEDIDO DE VENDA',105,y,{align:'center'});
 y += 15;
 doc.setFontSize(12);
 doc.text(`Pedido Nº ${pedido.numero_pedido}`,margem,y);
 doc.text(`Entrega: ${formatarDataBR(pedido.previsao_entrega)}`,130,y);
 linha();

 titulo('CLIENTE');
 doc.setFont('helvetica','normal');
 doc.setFontSize(11);
 doc.text(`Nome: ${cliente?.nome || ''}`,margem,y); y+=7;
 doc.text(`Telefone: ${cliente?.telefone || ''}`,margem,y); y+=7;
 doc.text(`Email: ${cliente?.email || ''}`,margem,y); y+=12;

 titulo('ENDEREÇO DE ENTREGA');
 doc.setFont('helvetica','normal');
 doc.setFontSize(11);
 doc.text(pedido.endereco || '',margem,y); y+=7;
 doc.text(`Referência: ${pedido.referencia || ''}`,margem,y); y+=12;

 titulo('PRODUTOS');
 doc.setFont('helvetica','bold');
 doc.setFontSize(11);
 doc.text('Produto',margem,y);
 doc.text('Qtd',145,y);
 doc.text('Valor',165,y);
 y+=7;
 linha();

 itens?.forEach(item=>{
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.text(item.produto,margem,y,{maxWidth:115});
  doc.setFont('helvetica','normal');
  doc.text(String(item.quantidade),145,y);
  doc.text(formatarBRL(item.valor_unitario),165,y);
  y+=12;
 });

 linha();
 titulo('RESUMO FINANCEIRO');
 doc.setFont('helvetica','normal');
 doc.setFontSize(11);
 doc.text(`Forma de pagamento: ${pedido.forma_pagamento || ''}`,margem,y); y+=7;
 doc.text(`Frete: ${formatarBRL(pedido.frete || 0)}`,margem,y); y+=12;

 doc.setFont('helvetica','bold');
 doc.setFontSize(16);
 doc.text(`TOTAL DO PEDIDO: ${formatarBRL(pedido.valor_total || 0)}`,margem,y);
 y+=18;
 doc.setFontSize(11);
 doc.text(`Previsão de entrega: ${formatarDataBR(pedido.previsao_entrega)}`,margem,y);

 y+=35;
 doc.line(70,y,140,y);
 y+=8;
 doc.setFont('helvetica','normal');
 doc.text('Assinatura do Cliente',105,y,{align:'center'});

 y+=15;
 doc.setFontSize(9);
 doc.text('Documento de pedido de venda - Decoralar',105,y,{align:'center'});

 doc.save(`Pedido_${pedido.numero_pedido}.pdf`);
}
