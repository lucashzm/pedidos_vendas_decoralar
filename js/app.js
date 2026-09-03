const produtos = [
 {nome:'Produto teste 1'},
 {nome:'Produto teste 2'}
];

const select=document.getElementById('produtoSelect');
produtos.forEach(p=>{
 const option=document.createElement('option');
 option.value=p.nome;
 option.textContent=p.nome;
 select.appendChild(option);
});

const lista=[];
const ul=document.getElementById('listaProdutos');

document.getElementById('adicionarProduto').onclick=()=>{
 const produto=select.value;
 const quantidade=document.getElementById('quantidade').value;
 if(!produto)return;
 lista.push({produto,quantidade});
 const li=document.createElement('li');
 li.textContent=`${quantidade}x ${produto}`;
 ul.appendChild(li);
};

document.getElementById('finalizar').onclick=()=>{
 const pedido={
 cliente:document.getElementById('clienteNome').value,
 telefone:document.getElementById('clienteTelefone').value,
 vendedor:document.getElementById('vendedorNome').value,
 pagamento:document.getElementById('pagamento').value,
 observacoes:document.getElementById('observacoes').value,
 produtos:lista
 };
 console.log('Pedido criado:',pedido);
 alert('Pedido preparado com sucesso!');
};