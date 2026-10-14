import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography
} from '@mui/material';
import { api } from 'services/api';

const lista = (r) => Array.isArray(r) ? r : Array.isArray(r?.content) ? r.content : [];
const mensagem = (e) => e?.message || 'Não foi possível concluir a operação.';
const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const vazio = () => ({ nome: '', email: '', senha: '' });

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erroForm, setErroForm] = useState('');
  const [senhaUsuario, setSenhaUsuario] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try { setUsuarios(lista(await api('/usuarios')).sort((a, b) => Number(b.id) - Number(a.id))); }
    catch (e) { setErro(`Não foi possível carregar os usuários: ${mensagem(e)}`); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const visiveis = useMemo(() => usuarios.filter((u) => {
    const situacao = filtro === 'TODOS' || (filtro === 'ATIVOS' ? u.ativo === true : u.ativo === false);
    return situacao && [u.id, u.nome, u.email, u.perfil].join(' ').toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'));
  }), [usuarios, filtro, busca]);

  const abrirNovo = () => { setEditando(null); setForm(vazio()); setErroForm(''); setFormAberto(true); };
  const abrirEditar = (u) => { setEditando(u); setForm({ nome: u.nome || '', email: u.email || '', senha: '' }); setErroForm(''); setFormAberto(true); };
  const mudar = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));
  const salvar = async (evento) => {
    evento.preventDefault(); setErroForm('');
    const nome = form.nome.trim(); const email = form.email.trim();
    if (!nome || !email) { setErroForm('Informe nome e e-mail.'); return; }
    if (!emailValido(email)) { setErroForm('Informe um e-mail válido.'); return; }
    if (!editando && form.senha.length < 6) { setErroForm('A senha deve ter pelo menos 6 caracteres.'); return; }
    setSalvando(true);
    try {
      await api(editando ? `/usuarios/${editando.id}` : '/usuarios', {
        method: editando ? 'PUT' : 'POST',
        body: JSON.stringify(editando ? { nome, email } : { nome, email, senha: form.senha })
      });
      setFormAberto(false); setSucesso(editando ? 'Usuário atualizado com sucesso.' : 'Funcionário cadastrado com sucesso.'); await carregar();
    } catch (e) { setErroForm(mensagem(e)); }
    finally { setSalvando(false); }
  };
  const alterarSenha = async (evento) => {
    evento.preventDefault(); setErroSenha('');
    if (novaSenha.length < 6) { setErroSenha('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    setSalvando(true);
    try {
      await api(`/usuarios/${senhaUsuario.id}/senha`, { method: 'PATCH', body: JSON.stringify({ novaSenha }) });
      setSenhaUsuario(null); setNovaSenha(''); setSucesso('Senha alterada com sucesso.');
    } catch (e) { setErroSenha(mensagem(e)); }
    finally { setSalvando(false); }
  };
  const alternarAtivo = async () => {
    if (!confirmacao) return;
    const usuario = confirmacao; setSalvando(true); setErro('');
    try {
      await api(`/usuarios/${usuario.id}/${usuario.ativo ? 'desativar' : 'reativar'}`, { method: 'PATCH' });
      setConfirmacao(null); setSucesso(usuario.ativo ? 'Usuário desativado.' : 'Usuário reativado.'); await carregar();
    } catch (e) { setConfirmacao(null); setErro(mensagem(e)); }
    finally { setSalvando(false); }
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="h4">Usuários</Typography><Typography color="text.secondary">Gerencie os funcionários e o acesso à Higienizei.</Typography></Box>
        <Button variant="contained" onClick={abrirNovo} sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}>Novo funcionário</Button>
      </Stack>
      {erro && <Alert severity="error" onClose={() => setErro('')}>{erro}</Alert>}
      {sucesso && <Alert severity="success" onClose={() => setSucesso('')}>{sucesso}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography color="text.secondary">Total de usuários</Typography><Typography variant="h4">{usuarios.length}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography color="text.secondary">Ativos</Typography><Typography variant="h4">{usuarios.filter(u => u.ativo === true).length}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography color="text.secondary">Inativos</Typography><Typography variant="h4">{usuarios.filter(u => u.ativo === false).length}</Typography></Paper>
      </Stack>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
          <TextField size="small" label="Pesquisar por nome, e-mail ou perfil" value={busca} onChange={e => setBusca(e.target.value)} fullWidth />
          <TextField select size="small" label="Situação" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="TODOS">Todos</MenuItem><MenuItem value="ATIVOS">Ativos</MenuItem><MenuItem value="INATIVOS">Inativos</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={carregar} disabled={carregando}>Atualizar</Button>
        </Stack>
        {carregando ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> :
          <TableContainer><Table size="small"><TableHead><TableRow><TableCell>ID</TableCell><TableCell>Nome</TableCell><TableCell>E-mail</TableCell><TableCell>Perfil</TableCell><TableCell>Situação</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
            <TableBody>{visiveis.map(u => <TableRow key={u.id} hover>
              <TableCell>{u.id}</TableCell><TableCell>{u.nome}</TableCell><TableCell>{u.email}</TableCell><TableCell>{u.perfil === 'ADMIN' ? 'Administrador' : u.perfil === 'FUNCIONARIO' ? 'Funcionário' : u.perfil || '—'}</TableCell>
              <TableCell><Chip size="small" color={u.ativo === true ? 'success' : 'default'} label={u.ativo === true ? 'Ativo' : 'Inativo'} /></TableCell>
              <TableCell align="right"><Stack direction="row" justifyContent="flex-end" flexWrap="wrap" gap={1}>
                <Button size="small" onClick={() => setDetalhe(u)}>Detalhes</Button>
                <Button size="small" onClick={() => abrirEditar(u)}>Editar</Button>
                <Button size="small" onClick={() => { setSenhaUsuario(u); setNovaSenha(''); setErroSenha(''); }}>Senha</Button>
                <Button size="small" color={u.ativo === true ? 'error' : 'success'} onClick={() => setConfirmacao(u)}>{u.ativo === true ? 'Desativar' : 'Reativar'}</Button>
              </Stack></TableCell>
            </TableRow>)}{visiveis.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhum usuário encontrado.</TableCell></TableRow>}</TableBody>
          </Table></TableContainer>}
      </Paper>
      <Dialog open={formAberto} onClose={() => !salvando && setFormAberto(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={salvar}><DialogTitle>{editando ? 'Editar usuário' : 'Novo funcionário'}</DialogTitle><DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {erroForm && <Alert severity="error">{erroForm}</Alert>}
            <TextField required fullWidth label="Nome" value={form.nome} onChange={e => mudar('nome', e.target.value)} />
            <TextField required fullWidth type="email" label="E-mail" value={form.email} onChange={e => mudar('email', e.target.value)} />
            {!editando && <TextField required fullWidth type="password" autoComplete="new-password" label="Senha" helperText="Mínimo de 6 caracteres" value={form.senha} onChange={e => mudar('senha', e.target.value)} inputProps={{ minLength: 6 }} />}
            {!editando && <Alert severity="info">O novo usuário será cadastrado como funcionário.</Alert>}
          </Stack>
        </DialogContent><DialogActions><Button onClick={() => setFormAberto(false)} disabled={salvando}>Cancelar</Button><Button type="submit" variant="contained" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button></DialogActions></Box>
      </Dialog>
      <Dialog open={Boolean(senhaUsuario)} onClose={() => !salvando && setSenhaUsuario(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={alterarSenha}><DialogTitle>Alterar senha</DialogTitle><DialogContent>
          <Typography sx={{ mb: 2 }}>Usuário: <strong>{senhaUsuario?.nome}</strong></Typography>
          {erroSenha && <Alert severity="error" sx={{ mb: 2 }}>{erroSenha}</Alert>}
          <TextField required fullWidth type="password" autoComplete="new-password" label="Nova senha" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} helperText="Mínimo de 6 caracteres" inputProps={{ minLength: 6 }} />
        </DialogContent><DialogActions><Button disabled={salvando} onClick={() => setSenhaUsuario(null)}>Cancelar</Button><Button type="submit" variant="contained" disabled={salvando}>Alterar senha</Button></DialogActions></Box>
      </Dialog>
      <Dialog open={Boolean(confirmacao)} onClose={() => !salvando && setConfirmacao(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirmacao?.ativo ? 'Desativar usuário?' : 'Reativar usuário?'}</DialogTitle><DialogContent><Typography>Deseja {confirmacao?.ativo ? 'desativar' : 'reativar'} o acesso de <strong>{confirmacao?.nome}</strong>?</Typography></DialogContent>
        <DialogActions><Button disabled={salvando} onClick={() => setConfirmacao(null)}>Voltar</Button><Button disabled={salvando} color={confirmacao?.ativo ? 'error' : 'success'} variant="contained" onClick={alternarAtivo}>Confirmar</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(detalhe)} onClose={() => setDetalhe(null)} fullWidth maxWidth="xs"><DialogTitle>Detalhes do usuário</DialogTitle><DialogContent>
        {detalhe && <Stack spacing={1}><Typography><strong>ID:</strong> {detalhe.id}</Typography><Typography><strong>Nome:</strong> {detalhe.nome}</Typography><Typography><strong>E-mail:</strong> {detalhe.email}</Typography><Typography><strong>Perfil:</strong> {detalhe.perfil}</Typography><Typography><strong>Situação:</strong> {detalhe.ativo ? 'Ativo' : 'Inativo'}</Typography></Stack>}
      </DialogContent><DialogActions><Button onClick={() => setDetalhe(null)}>Fechar</Button></DialogActions></Dialog>
    </Stack>
  );
}
