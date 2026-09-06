async function gerarPDF(idPedido){
 const {data:pedido,error}=await db.from('pedidos').select('*').eq('id',idPedido).single();
 if(error) throw error;
 const {data:itens}=await db.from('pedido_itens').select('*').eq('pedido_id',idPedido);
 const {data:cliente}=await db.from('clientes').select('*').eq('id',pedido.cliente_id).single();
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF();
 const margem=18;
 const largura=210;
 const direita=largura-margem;
 let y=18;
 const formatarDataBR=d=>{if(!d)return '';const [a,m,di]=d.split('-');return `${di}/${m}/${a}`};
 const formatarBRL=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const titulo=t=>{doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(95,95,95);doc.text(t,margem,y);y+=6};
 const campo=(label,valor)=>{doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(35,35,35);doc.text(label,margem,y);const x=margem+doc.getTextWidth(label);doc.setFont('helvetica','normal');doc.text(valor||'',x,y);y+=6};
 const linha=()=>{doc.setDrawColor(220,220,220);doc.line(margem,y,direita,y);y+=8};
 doc.setTextColor(35,35,35);doc.setFont('helvetica','bold');doc.setFontSize(21);doc.text('DECORALAR',margem,y);
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text('PEDIDO DE VENDA',direita,y-4,{align:'right'});
 doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(55,55,55);doc.text(`Nº ${pedido.numero_pedido}`,direita,y+3,{align:'right'});y+=11;linha();
 titulo('CLIENTE');campo('Nome: ',cliente?.nome||'');campo('CPF/CNPJ: ',cliente?.cpf_cnpj||pedido.cliente_cpf_cnpj||'');campo('Telefone: ',cliente?.telefone||'');campo('E-mail: ',cliente?.email||'');y+=3;
 titulo('ENDEREÇO DE ENTREGA');const e=(pedido.endereco||'').split(',').map(x=>x.trim());campo('Rua: ',`${e[1]||''}   Nº: ${e[2]||''}`);campo('Bairro: ',e[3]||'');campo('CEP: ',e[0]||'');campo('Cidade: ',e[4]||'');campo('Referência: ',pedido.referencia||'');
 doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(35,35,35);doc.text('Observações de entrega:',margem,y);y+=5;doc.setFont('helvetica','normal');const obsEntrega=doc.splitTextToSize(pedido.observacoes||'',170);doc.text(obsEntrega,margem,y);y+=(obsEntrega.length*4)+5;doc.setFont('helvetica','bold');doc.text('Previsão de entrega: ',margem,y);const xPrev=margem+doc.getTextWidth('Previsão de entrega: ');doc.setFont('helvetica','normal');doc.text(formatarDataBR(pedido.previsao_entrega),xPrev,y);y+=10;
 titulo('PRODUTOS');y+=3;doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(95,95,95);doc.text('PRODUTO',margem,y);doc.text('QTD',150,y);doc.text('VALOR',direita,y,{align:'right'});y+=5;doc.setDrawColor(205,205,205);doc.line(margem,y,direita,y);y+=7;
 itens?.forEach(i=>{doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(35,35,35);const l=doc.splitTextToSize(i.produto,120);doc.text(l,margem,y);doc.text(String(i.quantidade),150,y);doc.text(formatarBRL(i.valor_unitario),direita,y,{align:'right'});y+=(l.length*5)+6});
 linha();titulo('RESUMO FINANCEIRO');campo('Forma de pagamento: ',pedido.forma_pagamento||'');campo('Frete: ',formatarBRL(Math.abs(Number(pedido.frete||0))));campo('Desconto: ',formatarBRL(Math.abs(Number(pedido.desconto||0))));
 y+=5;doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(45,45,45);doc.text('TOTAL DO PEDIDO',margem,y);doc.setFontSize(14);doc.text(formatarBRL(pedido.valor_total||0),margem+doc.getTextWidth('TOTAL DO PEDIDO')+8,y,{align:'left'});y+=18;
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(130,130,130);doc.text('Pedido de venda • Decoralar',105,y,{align:'center'});doc.save(`Pedido_Venda_${pedido.numero_pedido}.pdf`);
}
