import { useState, useEffect } from "react";
import "./App.css";
import api from "./services/api";

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
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
})();

function formatarValor(v) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number(v || 0));
}

function formatarData(data) {
    const d = parseDateLocal(data);
    if (!d) return "";
    return d.toLocaleDateString("pt-BR");
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
export default function App() {
    const imagens = [
        { url: "/area da pisicina-noturno 2 (1).jpeg", alt: "Piscina noite" },
        { url: "/area da pisina distante.jpeg", alt: "Vista panorâmica" },
        { url: "/area da pisicina- diurna.jpeg", alt: "Piscina dia" },
        { url: "/casa1.jpg.jpeg", alt: "Interior" },
        { url: "/frente da casa.jpeg", alt: "Fachada" },
        { url: "/area de lazer.jpeg", alt: "Lazer" },
    ];

    const [imagemIndex, setImagemIndex] = useState(0);
    const [fade, setFade] = useState(true);
    const [nome, setNome] = useState("");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [valorDiaria] = useState(300);
    const [mensagem, setMensagem] = useState("");
    const [erro, setErro] = useState(false);
    const [reservas, setReservas] = useState([]);
    const [verCalendario, setVerCalendario] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [verChat, setVerChat] = useState(false);

    useEffect(() => {
        api.get("/reservas")
            .then((res) => setReservas(res.data))
            .catch(() => {
                setMensagem("❌ Erro ao sincronizar reservas");
                setErro(true);
            });
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setImagemIndex((prev) => (prev + 1) % imagens.length);
                setFade(true);
            }, 800);
        }, 5000);
        return () => clearInterval(interval);
    }, [imagens.length]);

    const handleReserva = () => {
        setMensagem("");
        setErro(false);
        if (!nome || !dataInicio || !dataFim) {
            setMensagem("⚠️ Preencha todos os campos.");
            setErro(true);
            return;
        }

        const inicio = parseDateLocal(dataInicio);
        const fim = parseDateLocal(dataFim);

        if (fim < inicio) {
            setMensagem("⚠️ Data final inválida.");
            setErro(true);
            return;
        }

        const conflito = reservas.some((r) => {
            const rInicio = parseDateLocal(r.dataInicio);
            const rFim = parseDateLocal(r.dataFim);
            return inicio <= rFim && fim >= rInicio;
        });

        if (conflito) {
            setMensagem("⚠️ Período indisponível.");
            setErro(true);
            return;
        }

        const total = calcularTotalDatas(dataInicio, dataFim, valorDiaria);

        api.post("/reservas", { nome, dataInicio, dataFim, total })
            .then((res) => {
                setReservas((prev) => [...prev, res.data]);
                setMensagem(`✅ Reserva confirmada!`);
                setNome("");
                setDataInicio("");
                setDataFim("");
            })
            .catch(() => {
                setErro(true);
                setMensagem("❌ Erro ao processar reserva.");
            });
    };

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        const userMessage = { role: "user", text: chatInput };
        setChatMessages((prev) => [...prev, userMessage]);
        setChatInput("");

        fetch("http://localhost:5000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: userMessage.text }),
        })
            .then((res) => res.json())
            .then((data) => {
                const aiMessage = { role: "IA", text: data.response || "Estou à disposição." };
                setChatMessages((prev) => [...prev, aiMessage]);
            })
            .catch(() => {
                setChatMessages((prev) => [...prev, { role: "IA", text: "Erro na conexão." }]);
            });
    };

    return (
        <div className="container-premium" style={{
            minHeight: "100vh",
            background: "radial-gradient(circle at top, #1a1a1a 0%, #000 100%)",
            color: "#fff",
            padding: "40px 20px",
            fontFamily: "'Inter', sans-serif"
        }}>

            {/* ALERT FLOATING */}
            {mensagem && (
                <div style={{
                    position: "fixed", top: 20, right: 20, padding: "15px 25px",
                    borderRadius: "12px", background: erro ? "#ff4d4d" : "#00c853",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 1000, fontWeight: 600
                }}>
                    {mensagem}
                </div>
            )}

            {/* HEADER */}
            <header style={{ textAlign: "center", marginBottom: 40 }}>
                <img src="/logomarca RM.png" alt="Logo" style={{ width: 70, filter: "drop-shadow(0 0 10px rgba(255,255,255,0.2))" }} />
                <h1 style={{
                    letterSpacing: "6px",
                    fontWeight: 800,
                    marginTop: "20px",
                    fontSize: "2rem",
                    textTransform: "uppercase",
                    background: "linear-gradient(to right, #fff 20%, #666 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textAlign: "center"
                }}>
                    RM ESPAÇOS & EVENTOS
                </h1>
            </header>

            <main style={{
                maxWidth: 400, margin: "auto", background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 24, padding: 30, boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
            }}>

                {/* CARROSSEL */}
                <div style={{ position: "relative", marginBottom: 30 }}>
                    <img
                        src={imagens[imagemIndex].url}
                        alt={imagens[imagemIndex].alt}
                        style={{
                            width: "100%", height: 220, objectFit: "cover",
                            borderRadius: 16, opacity: fade ? 1 : 0, transition: "0.8s ease-in-out"
                        }}
                    />
                    <div style={{
                        position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.6)",
                        padding: "4px 12px", borderRadius: 20, fontSize: "11px"
                    }}>
                        {imagemIndex + 1} / {imagens.length}
                    </div>
                </div>

                {/* INFO PREÇO DINÂMICO */}
                <div style={{ marginBottom: 25, borderLeft: "3px solid #00c853", paddingLeft: 15 }}>
                    <p style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>Investimento Total</p>
                    <h2 style={{ fontSize: "1.5rem", margin: "5px 0", color: "#00c853" }}>
                        {formatarValor(calcularTotalDatas(dataInicio, dataFim, valorDiaria) || valorDiaria)}
                    </h2>
                    <p style={{ fontSize: "0.7rem", opacity: 0.5 }}>Diária: {formatarValor(valorDiaria)}</p>
                </div>

                {/* FORMULÁRIO */}
                <div style={{ display: "grid", gap: 15 }}>
                    <input
                        className="premium-input"
                        placeholder="Nome completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ display: "grid", gap: 5 }}>
                            <label style={{ fontSize: "10px", opacity: 0.5 }}>CHECK-IN</label>
                            <input type="date" min={hoje} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="premium-input" />
                        </div>
                        <div style={{ display: "grid", gap: 5 }}>
                            <label style={{ fontSize: "10px", opacity: 0.5 }}>CHECK-OUT</label>
                            <input type="date" min={dataInicio || hoje} value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="premium-input" />
                        </div>
                    </div>

                    <button className="btn-confirm" onClick={handleReserva}>Solicitar Reserva</button>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <button className="btn-sec" onClick={() => setVerCalendario(true)}>Agenda</button>
                        <button className="btn-sec" onClick={() => setVerChat(true)} style={{ background: "#000" }}>🤖 Chat IA</button>
                    </div>
                </div>
            </main>

            {/* MODAIS */}
            {verCalendario && (
                <Modal fechar={() => setVerCalendario(false)} titulo="Agenda de Reservas">
                    <CalendarioReservas reservas={reservas} setReservas={setReservas} fechar={() => setVerCalendario(false)} />
                </Modal>
            )}

            {verChat && (
                <Modal fechar={() => setVerChat(false)} titulo="Concierge Digital">
                    <ChatIA messages={chatMessages} input={chatInput} setInput={setChatInput} sendMessage={sendChatMessage} fechar={() => setVerChat(false)} />
                </Modal>
            )}

            <style>{`
                .premium-input {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 12px 15px;
                    border-radius: 12px;
                    color: #fff;
                    outline: none;
                    transition: 0.3s;
                }
                .premium-input:focus { border-color: #fff; background: rgba(255,255,255,0.1); }
                
                .btn-confirm {
                    background: #fff;
                    color: #000;
                    border: none;
                    padding: 15px;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,255,255,0.2); }

                .btn-sec {
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    color: #fff;
                    padding: 10px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: 0.3s;
                }
                .btn-sec:hover { border-color: #fff; }
            `}</style>
        </div>
    );
}

/* =========================
    SUB-COMPONENTES
========================= */
function Modal({ children, fechar, titulo }) {
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, backdropFilter: "blur(10px)"
        }}>
            <div style={{
                background: "#111", border: "1px solid #333", padding: 30,
                borderRadius: 24, width: "95%", maxWidth: 420
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{titulo}</h3>
                    <button onClick={fechar} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function CalendarioReservas({ reservas, setReservas, fechar }) {
    const cancelarReserva = (reserva) => {
        if (!window.confirm(`Cancelar a reserva de ${reserva.nome}?`)) return;
        api.delete(`/reservas/${reserva.id}`).then(() => {
            setReservas((prev) => prev.filter((r) => r.id !== reserva.id));
        });
    };

    return (
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "5px" }}>
            {reservas.length === 0 ? (
                <p style={{ textAlign: "center", opacity: 0.5, padding: "20px" }}>Sem reservas no momento.</p>
            ) : (
                reservas.map((r) => (
                    <div key={r.id} style={{ 
                        padding: "12px 0", 
                        borderBottom: "1px solid #222",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{r.nome}</p>
                            <p style={{ margin: 0, fontSize: "11px", opacity: 0.6 }}>
                                {formatarData(r.dataInicio)} - {formatarData(r.dataFim)}
                            </p>
                            <button 
                                onClick={() => cancelarReserva(r)} 
                                style={{ color: "#ff4d4d", background: "none", border: "none", fontSize: "10px", padding: "5px 0 0 0", cursor: "pointer", fontWeight: "bold" }}
                            >
                                CANCELAR
                            </button>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <span style={{ 
                                color: "#00c853", 
                                fontWeight: "800", 
                                fontSize: "14px",
                                background: "rgba(0, 200, 83, 0.1)",
                                padding: "4px 8px",
                                borderRadius: "8px"
                            }}>
                                {formatarValor(r.total)}
                            </span>
                        </div>
                    </div>
                ))
            )}
            <button onClick={fechar} className="btn-confirm" style={{ width: "100%", marginTop: 20 }}>Fechar Painel</button>
        </div>
    );
}

function ChatIA({ messages, input, setInput, sendMessage, fechar }) {
    return (
        <div>
            <div style={{ height: 250, overflowY: "auto", background: "#000", padding: 15, borderRadius: 12, marginBottom: 15 }}>
                {messages.map((msg, idx) => (
                    <p key={idx} style={{ fontSize: "13px", marginBottom: 12, lineHeight: "1.4" }}>
                        <span style={{ color: msg.role === "user" ? "#fff" : "#00c853", fontWeight: 700, display: "block", fontSize: "10px", marginBottom: "2px" }}>
                            {msg.role === "user" ? "VOCÊ" : "CONCIERGE RM"}
                        </span>
                        {msg.text}
                    </p>
                ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
                <input
                    className="premium-input" 
                    style={{ flex: 1 }}
                    placeholder="Pergunte algo..."
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage} className="btn-confirm" style={{ padding: "0 20px" }}>↑</button>
            </div>
        </div>
    );
}
