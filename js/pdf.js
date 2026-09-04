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

 doc.setFontSize(20);
 doc.text('DECORALAR', 105, y, { align:'center' });

 y += 12;
 doc.setFontSize(14);
 doc.text('PEDIDO DE VENDA', 105, y, { align:'center' });

 y += 10;
 doc.setFontSize(12);
 doc.text(`Pedido Nº ${pedido.numero_pedido}`, 20, y);

 y += 15;
 doc.setFontSize(11);
 doc.text('CLIENTE', 20, y);
 y += 7;
 doc.text(`Nome: ${cliente?.nome || ''}`, 20, y);
 y += 7;
 doc.text(`Telefone: ${cliente?.telefone || ''}`, 20, y);
 y += 7;
 doc.text(`Email: ${cliente?.email || ''}`, 20, y);

 y += 12;
 doc.text('ENDEREÇO DE ENTREGA', 20, y);
 y += 7;
 doc.text(pedido.endereco || '', 20, y);
 y += 7;
 doc.text(`Referência: ${pedido.referencia || ''}`, 20, y);

 y += 12;
 doc.text('PRODUTOS', 20, y);

 itens?.forEach(item => {
  y += 7;
  doc.text(`${item.produto}`, 20, y);
  y += 6;
  doc.text(`Qtd: ${item.quantidade}   Valor unitário: ${formatarBRL(item.valor_unitario)}`, 25, y);
 });

 y += 12;
 doc.text('RESUMO', 20, y);
 y += 7;
 doc.text(`Frete: ${formatarBRL(pedido.frete || 0)}`, 20, y);
 y += 7;
 doc.text(`TOTAL: ${formatarBRL(pedido.valor_total || 0)}`, 20, y);

 y += 10;
 doc.text(`Entrega prevista: ${formatarDataBR(pedido.previsao_entrega)}`, 20, y);

 y += 15;
 doc.text('Obrigado pela preferência!', 20, y);

 doc.save(`Pedido_${pedido.numero_pedido}.pdf`);
}
