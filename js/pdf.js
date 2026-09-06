async function gerarPDF(idPedido){
 const {data:pedido,error}=await db.from('pedidos').select('*').eq('id',idPedido).single();
 if(error) throw error;
 const {data:itens}=await db.from('pedido_itens').select('*').eq('pedido_id',idPedido);
 const {data:cliente}=await db.from('clientes').select('*').eq('id',pedido.cliente_id).single();
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF();
 const margem=18;
 const direita=192;
 let y=18;
 const formatarDataBR=d=>{if(!d)return '';const [a,m,di]=d.split('-');return `${di}/${m}/${a}`};
 const formatarBRL=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const linha=tamanho=>{doc.setDrawColor(220,220,220);doc.setLineWidth(.25);doc.line(margem,y,direita,y);y+=tamanho||8};
 const secao=t=>{doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(105,105,105);doc.text(t,margem,y);y+=6};
 const campo=(label,valor)=>{doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(45,45,45);doc.text(label,margem,y);const x=margem+doc.getTextWidth(label)+3;doc.setFont('helvetica','normal');doc.text(valor||'—',x,y);y+=5.5};
 // Cabeçalho
 doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(35,35,35);doc.text('DECORALAR',margem,y);
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(130,130,130);doc.text('PEDIDO DE VENDA',direita,y-5,{align:'right'});
 doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(50,50,50);doc.text(`Nº ${pedido.numero_pedido}`,direita,y+2,{align:'right'});
 y+=10;doc.setDrawColor(45,45,45);doc.setLineWidth(.6);doc.line(margem,y,direita,y);y+=12;
 // Dados do cliente
 secao('DADOS DO CLIENTE');
 doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(35,35,35);doc.text(cliente?.nome||'—',margem,y);y+=6;
 doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(70,70,70);doc.text('CPF/CNPJ:',margem,y);doc.setFont('helvetica','normal');doc.text(cliente?.cpf_cnpj||pedido.cliente_cpf_cnpj||'—',margem+24,y);
 doc.setFont('helvetica','bold');doc.text('Telefone:',105,y);doc.setFont('helvetica','normal');doc.text(cliente?.telefone||'—',127,y);y+=5;
 doc.setFont('helvetica','bold');doc.text('E-mail:',margem,y);doc.setFont('helvetica','normal');doc.text(cliente?.email||'—',margem+18,y);y+=10;
 // Dados de entrega
 secao('DADOS DE ENTREGA');
 const e=(pedido.endereco||'').split(',').map(x=>x.trim());
 campo('Endereço: ',`${e[1]||''}   Nº ${e[2]||''}`);campo('Bairro: ',e[3]||'');campo('CEP: ',e[0]||'');campo('Cidade: ',e[4]||'');campo('Referência: ',pedido.referencia||'');
 doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(45,45,45);doc.text('Observações:',margem,y);doc.setFont('helvetica','normal');const obs=doc.splitTextToSize(pedido.observacoes||'—',158);doc.text(obs,margem+25,y);y+=(obs.length*4)+5;
 doc.setFont('helvetica','bold');doc.text('Previsão de entrega:',margem,y);doc.setFont('helvetica','normal');doc.text(formatarDataBR(pedido.previsao_entrega)||'—',margem+39,y);y+=11;
 // Itens
 secao('ITENS DO PEDIDO');
 doc.setFillColor(247,247,247);doc.rect(margem,y-4,direita-margem,8,'F');
 doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text('DESCRIÇÃO',margem+3,y+1);doc.text('QTD',145,y+1);doc.text('VALOR UNIT.',direita-3,y+1,{align:'right'});y+=9;
 itens?.forEach((i,idx)=>{doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(40,40,40);const l=doc.splitTextToSize(i.produto,112);doc.text(l,margem+3,y);doc.text(String(i.quantidade),145,y);doc.text(formatarBRL(i.valor_unitario),direita-3,y,{align:'right'});y+=(l.length*5)+6;if(idx<(itens.length-1)){doc.setDrawColor(232,232,232);doc.setLineWidth(.2);doc.line(margem,y-3,direita,y-3)}});
 y+=2;linha(8);
 // Resumo financeiro
 secao('RESUMO');
 doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(45,45,45);doc.text('Forma de pagamento:',margem,y);
 doc.setFont('helvetica','normal');doc.setTextColor(75,75,75);doc.text(pedido.forma_pagamento||'—',margem+39,y);
 doc.setFont('helvetica','normal');doc.setTextColor(75,75,75);doc.text('Frete',125,y);doc.text(formatarBRL(Math.abs(Number(pedido.frete||0))),direita,y,{align:'right'});y+=6;
 doc.text('Desconto',125,y);doc.text(formatarBRL(Math.abs(Number(pedido.desconto||0))),direita,y,{align:'right'});y+=10;
 // Mantém o total como o balão da versão atual
 doc.setFillColor(55,55,55);doc.roundedRect(108,y-5,direita-108,18,2,2,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text('TOTAL DO PEDIDO',114,y+2);doc.setFontSize(13);doc.text(formatarBRL(pedido.valor_total||0),direita-5,y+2,{align:'right'});y+=25;
 doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(145,145,145);doc.text('Pedido de venda • Decoralar',105,y,{align:'center'});
 doc.save(`Pedido_Venda_${pedido.numero_pedido}.pdf`);
}
