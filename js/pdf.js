async function gerarPDF(idPedido){
 const {data:pedido,error}=await db.from('pedidos').select('*').eq('id',idPedido).single();
 if(error) throw error;
 const {data:itens}=await db.from('pedido_itens').select('*').eq('pedido_id',idPedido);
 const {data:cliente}=await db.from('clientes').select('*').eq('id',pedido.cliente_id).single();
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF();
 const margem=20;
 let y=22;
 function formatarDataBR(data){if(!data)return '';const [ano,mes,dia]=data.split('-');return `${dia}/${mes}/${ano}`;}
 function titulo(t){doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(t,margem,y);y+=9;}
 function linha(){doc.line(margem,y,190,y);y+=10;}
 doc.setFont('helvetica','bold');doc.setFontSize(26);doc.text('DECORALAR',105,y,{align:'center'});y+=12;
 doc.setFontSize(17);doc.text('PEDIDO DE VENDA',105,y,{align:'center'});y+=18;
 doc.setFontSize(12);doc.text(`Pedido Nº ${pedido.numero_pedido}`,margem,y);y+=8;linha();
 titulo('CLIENTE');
 doc.setFont('helvetica','normal');doc.setFontSize(11);
 doc.text(`Nome: ${cliente?.nome||''}`,margem,y);y+=7;
 doc.text(`Telefone: ${cliente?.telefone||''}`,margem,y);y+=7;
 doc.text(`Email: ${cliente?.email||''}`,margem,y);y+=14;
 titulo('ENDEREÇO DE ENTREGA');
 doc.setFont('helvetica','normal');doc.setFontSize(11);
 const endereco=(pedido.endereco||'').split(',').map(e=>e.trim());
 doc.text(`Rua: ${endereco[1]||''}`,margem,y);
 doc.text(`Nº: ${endereco[2]||''}`,105,y);
 doc.text(`Bairro: ${endereco[3]||''}`,130,y);y+=7;
 doc.text(`CEP: ${endereco[0]||''}`,margem,y);
 doc.text(`Cidade: ${endereco[4]||''}`,80,y);y+=7;
 doc.text(`Referência: ${pedido.referencia||''}`,margem,y);y+=7;
 doc.text(`Previsão de entrega: ${formatarDataBR(pedido.previsao_entrega)}`,margem,y);y+=14;
 titulo('PRODUTOS');
 doc.setFont('helvetica','bold');doc.setFontSize(11);
 doc.text('Produto',margem,y);doc.text('Qtd',145,y);doc.text('Valor',165,y);y+=7;linha();
 itens?.forEach(item=>{doc.setFont('helvetica','bold');doc.setFontSize(10);const linhas=doc.splitTextToSize(item.produto,115);doc.text(linhas,margem,y);doc.setFont('helvetica','normal');doc.text(String(item.quantidade),145,y);doc.text(formatarBRL(item.valor_unitario),165,y);y+=(linhas.length*6)+8;});
 linha();titulo('RESUMO FINANCEIRO');
 doc.setFont('helvetica','normal');doc.setFontSize(11);
 doc.text(`Forma de pagamento: ${pedido.forma_pagamento||''}`,margem,y);y+=7;
 doc.text(`Frete: ${formatarBRL(pedido.frete||0)}`,margem,y);y+=12;
 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(`TOTAL DO PEDIDO: ${formatarBRL(pedido.valor_total||0)}`,margem,y);y+=16;
 titulo('OBSERVAÇÕES');
 doc.setFont('helvetica','normal');doc.setFontSize(10);
 const obs=doc.splitTextToSize(pedido.observacoes||'',170);
 doc.text(obs,margem,y);y+=(obs.length*5)+12;
 titulo('INFORMAÇÕES IMPORTANTES AO CLIENTE');
 doc.setFont('helvetica','normal');doc.setFontSize(9);
 const informacoes=[
  'O cliente declara estar ciente do modelo, características e especificações do produto adquirido.',
  'É responsabilidade do cliente conferir as medidas do ambiente antes da entrega e instalação.',
  'A conferência do produto deverá ser realizada no momento do recebimento.',
  'Qualquer divergência, avaria ou problema aparente deverá ser informado no ato da entrega.'
 ];
 informacoes.forEach(texto=>{
  const linhas=doc.splitTextToSize('- '+texto,170);
  doc.text(linhas,margem,y);
  y+=(linhas.length*4)+3;
 });
 y+=10;
 doc.line(45,y,165,y);y+=8;
 doc.setFontSize(10);doc.text('Assinatura do Cliente',105,y,{align:'center'});
 y+=15;doc.setFontSize(9);doc.text('Documento de pedido de venda - Decoralar',105,y,{align:'center'});
 doc.save(`Pedido_${pedido.numero_pedido}.pdf`);
}
