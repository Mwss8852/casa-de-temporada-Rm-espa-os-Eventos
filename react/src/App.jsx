import { useState, useEffect } from "react";
import { Calendar, Bot, Send, Trash2, Clock, Play } from "lucide-react";
import "./index.css";
import "./App.css";

/* =========================
   HELPERS GLOBAIS
========================= */
function parseDateLocal(value) {
  if (!value) return null;
  if (value.includes("T")) {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  }
  const [ano, mes, dia] = value.split("-");
  return new Date(ano, mes - 1, dia, 12, 0, 0);
}

const hoje = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

function formatarValor(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
}

function formatarData(data) {
  const d = parseDateLocal(data);
  return d ? d.toLocaleDateString("pt-BR") : "";
}

function calcularTotalDatas(inicioStr, fimStr, diaria) {
  const inicio = parseDateLocal(inicioStr);
  const fim = parseDateLocal(fimStr);
  if (!inicio || !fim) return 0;
  const diff = fim.getTime() - inicio.getTime();
  const dias = Math.ceil(diff / 86400000) + 1;
  return dias > 0 ? dias * diaria : 0;
}

/* =========================
   COMPONENTE PRINCIPAL
========================= */
function App() {
  const imagens = [
    { url: "/area da pisicina-noturno 2 (1).jpeg", alt: "Piscina noite" },
    { url: "/area da pisina distante.jpeg", alt: "Vista distante" },
    { url: "/area da pisicina- diurna.jpeg", alt: "Área externa" },
    { url: "/casa1.jpg.jpeg", alt: "Interior" },
    { url: "/frente da casa.jpeg", alt: "Fachada" },
    { url: "/area de lazer.jpeg", alt: "Lazer" },
  ];

  const [imagemIndex, setImagemIndex] = useState(0);
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [valorDiaria] = useState(300);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);

  const [reservas, setReservas] = useState(() => {
    const salvas = localStorage.getItem("@rm_reservas");
    return salvas ? JSON.parse(salvas) : [];
  });

  const [verCalendario, setVerCalendario] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [verChat, setVerChat] = useState(false);

  useEffect(() => {
    localStorage.setItem("@rm_reservas", JSON.stringify(reservas));
  }, [reservas]);

  useEffect(() => {
    const interval = setInterval(() => {
      setImagemIndex((prev) => (prev + 1) % imagens.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [imagens.length]);

  const handleReserva = (dadosReserva = null) => {
    const n = dadosReserva?.nome || nome;
    const dI = dadosReserva?.dataInicio || dataInicio;
    const dF = dadosReserva?.dataFim || dataFim;

    if (!n || !dI || !dF) {
      setMensagem("Preencha todos os campos.");
      setErro(true);
      return false;
    }

    const inicio = parseDateLocal(dI);
    const fim = parseDateLocal(dF);

    const conflito = reservas.some((r) => {
      const rInicio = parseDateLocal(r.dataInicio);
      const rFim = parseDateLocal(r.dataFim);
      return inicio <= rFim && fim >= rInicio;
    });

    if (conflito) {
      setMensagem("⚠️ Período indisponível.");
      setErro(true);
      return false;
    }

    const total = calcularTotalDatas(dI, dF, valorDiaria);
    const novaReserva = { id: Date.now(), nome: n, dataInicio: dI, dataFim: dF, total };

    setReservas((prev) => [...prev, novaReserva]);
    setMensagem("✅ Reserva confirmada!");
    setErro(false);
    return true;
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const userMessage = { role: "user", text: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");

    fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: userMessage.text,
        reservasAtuais: reservas,
        dataHoje: hoje
      }),
    })
      .then(res => res.json())
      .then((data) => {
        const aiMessage = { role: "ai", text: data.response || "Sem resposta da IA" };
        setChatMessages((prev) => [...prev, aiMessage]);

        if (data.agendar && data.dados) {
          if (handleReserva(data.dados)) {
            setChatMessages(prev => [...prev, { role: "ai", text: "✅ Sistema atualizado: reserva efetuada!" }]);
          }
        }
      })
      .catch(() => {
        setChatMessages((prev) => [...prev, { role: "ai", text: "Offline: Conecte o servidor de IA." }]);
      });
  };

  return (
    <div className="container">
      <div className="card">
        {mensagem && (
          <div className="status-msg" style={{
            textAlign: 'center', fontSize: '11px', color: erro ? '#ff4b2b' : 'var(--primary-glow)',
            marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600'
          }}>
            {mensagem}
          </div>
        )}

        <div className="header">
          <img src="/logomarca RM.png" alt="RM Logo" />
          <h1>RM ESPAÇOS & EVENTOS</h1>
          <p>Premium Experience</p>
        </div>

        <div className="carousel">
          <img src={imagens[imagemIndex].url} alt={imagens[imagemIndex].alt} />
        </div>

        <div className="info">
          <div>
            <span>Diária</span>
            <strong>{formatarValor(valorDiaria)}</strong>
          </div>
          <div>
            <span>Subtotal</span>
            <strong>{formatarValor(calcularTotalDatas(dataInicio, dataFim, valorDiaria))}</strong>
          </div>
        </div>

        <div className="form">
          <input
            placeholder="NOME COMPLETO"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="date"
              min={hoje}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <input
              type="date"
              min={dataInicio || hoje}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <button className="btn-primary" onClick={() => {
            if (handleReserva()) {
              setNome(""); setDataInicio(""); setDataFim("");
            }
          }}>
            Confirmar Agendamento
          </button>

          {/* Grupo de utilitários: Agenda e IA */}
          <div className="btn-group">
            <button
              className={`btn-utility ${verCalendario ? 'active' : ''}`}
              onClick={() => setVerCalendario(!verCalendario)}
              title="Ver Agenda"
            >
              <Calendar size={18} strokeWidth={2} />
              <span>{verCalendario ? "FECHAR" : "AGENDA"}</span>
            </button>

            <button
              className={`ai-trigger ${verChat ? 'active' : ''}`}
              onClick={() => setVerChat(!verChat)}
              title="Agente IA"
            >
              <Bot size={22} strokeWidth={2} />
            </button>
          </div>

          {/* Botão de Vídeo Tour Noturno */}
          <button 
            className="btn-video" 
            onClick={() => window.open('/casa noturna.mp4', '_blank')} 
            title="Tour Noturno"
          >
            <Play size={16} fill="currentColor" />
            <span>TOUR NOTURNO 4K</span>
          </button>
        </div>

        {verCalendario && (
          <div className="chat-box" style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '20px' }}>
            <h3 style={{ fontSize: '10px', letterSpacing: '2px', marginBottom: '15px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={12} /> RESERVAS ATIVAS
            </h3>

            {reservas.length === 0 ? (
              <p style={{ fontSize: '11px', opacity: 0.5 }}>Nenhum registro encontrado.</p>
            ) : (
              reservas.map(r => (
                <div key={r.id} style={{ borderBottom: '1px solid var(--glass-border)', padding: '15px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                        {r.nome}
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={10} /> {formatarData(r.dataInicio)} — {formatarData(r.dataFim)}
                      </p>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(0, 242, 254, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 242, 254, 0.2)'
                      }}>
                        <span style={{ fontSize: '10px', color: 'var(--primary-glow)', fontWeight: 'bold' }}>
                          {formatarValor(r.total)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setReservas(reservas.filter(res => res.id !== r.id))}
                      className="btn-delete-reserva"
                      style={{
                        background: 'rgba(255, 75, 43, 0.1)',
                        border: 'none',
                        color: '#ff4b2b',
                        padding: '8px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: '0.3s'
                      }}
                      title="Cancelar Reserva"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {verChat && (
          <div className="chat-box" style={{ marginTop: '20px' }}>
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div className="msg-ai">
                  Olá! Sou o assistente RM. Como posso ajudar com sua reserva?
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={msg.role === "user" ? "msg-user" : "msg-ai"}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Pergunte à IA..."
                style={{ marginBottom: 0, flex: 1 }}
              />
              <button onClick={sendChatMessage} className="btn-send-ai" style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '0 15px', 
                flex: '0 0 50px',
                cursor: 'pointer',
                color: '#fff'
              }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        <footer>
          DESENVOLVIDO POR MICHAEL & JOÃO MONTEIRO © 2026
        </footer>
      </div>
    </div>
  );
}

export default App;