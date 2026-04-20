import os
import traceback
from datetime import datetime, date
from dotenv import load_dotenv

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq

load_dotenv()

app = Flask(__name__)
CORS(app)

# ================= CONFIGURAÇÕES =================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")
API_BASE_URL = os.getenv("API_BASE_URL")

client = Groq(api_key=GROQ_API_KEY)
conversation_memory = []

# ================= FUNÇÕES DE INTEGRAÇÃO =================

def consultar_ocupacao_real():
    try:
        res = requests.get(f"{API_BASE_URL}/reservas", timeout=5)
        return res.json() if res.status_code == 200 else []
    except Exception as e:
        print(f"Erro ao buscar ocupação: {e}")
        return []

def consultar_metricas_financeiras():
    """Percorre as reservas e calcula o lucro total e volume."""
    try:
        res = requests.get(f"{API_BASE_URL}/reservas", timeout=5)
        if res.status_code == 200:
            reservas = res.json()
            lucro_total = sum(float(r.get('total', 0)) for r in reservas)
            quantidade = len(reservas)
            return lucro_total, quantidade
        return 0, 0
    except Exception as e:
        print(f"Erro ao calcular financeiro: {e}")
        return 0, 0

def salvar_no_banco(payload):
    try:
        res = requests.post(f"{API_BASE_URL}/reservas", json=payload, timeout=5)
        return res.json() if res.status_code in [200, 201] else None
    except Exception as e:
        print(f"Erro ao salvar: {e}")
        return None

# ================= LÓGICA DO AGENTE =================

def perguntar_ao_agente(mensagem_usuario):
    global conversation_memory
    hoje_str = date.today().isoformat()
    
    reservas = consultar_ocupacao_real()
    contexto_reservas = "DATAS JÁ RESERVADAS:\n"
    for r in reservas:
        contexto_reservas += f"- De {r.get('dataInicio')} até {r.get('dataFim')}\n"

    system_prompt = f"""
Você é o atendente da RM ESPAÇOS & EVENTOS. Hoje é dia {hoje_str}.

REGRAS:
1. NOME DO CLIENTE: Nunca use o comando CRIAR_RESERVA se você não souber o nome completo do cliente. Se ele não informou, pergunte primeiro: "Poderia me informar seu nome completo para prosseguirmos?".
2. BLOQUEIO: Se pedirem datas ANTERIORES a {hoje_str}, recuse e diga que só aceitamos datas futuras.
3. DISPONIBILIDADE: Consulte estas datas ocupadas antes de responder:
{contexto_reservas}
4. Para reservar, use o formato:
CRIAR_RESERVA
nome: <nome>
inicio: <YYYY-MM-DD>
fim: <YYYY-MM-DD>
"""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_memory[-6:])
    messages.append({"role": "user", "content": mensagem_usuario})

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.1,
    )
    return response.choices[0].message.content

# ================= PROCESSADOR DE COMANDOS =================

def executar_reserva(texto_ia):
    if "CRIAR_RESERVA" not in texto_ia:
        return None
    try:
        linhas = texto_ia.split("\n")
        # Extração dos dados
        nome = next(l.split(":")[1].strip() for l in linhas if "nome:" in l.lower())
        inicio = next(l.split(":")[1].strip() for l in linhas if "inicio:" in l.lower())
        fim = next(l.split(":")[1].strip() for l in linhas if "fim:" in l.lower())

        # --- NOVA TRAVA DE SEGURANÇA PARA O NOME ---
        # Verifica se o nome tem menos de 3 caracteres ou se a IA colocou placeholders
        if len(nome) < 3 or "<nome>" in nome or "nome:" in nome:
            return "⚠️ Preciso que você me informe seu nome completo para concluir o agendamento."

        # Validação de data passada
        if date.fromisoformat(inicio) < date.today():
            return "❌ Erro: Não é permitido agendar para o passado."

        dias = (date.fromisoformat(fim) - date.fromisoformat(inicio)).days + 1
        valor = dias * 300

        res = salvar_no_banco({"nome": nome, "dataInicio": inicio, "dataFim": fim, "total": valor})
        return f"✅ Reserva confirmada para {nome}! Total: R$ {valor},00." if res else "❌ Erro ao salvar no banco."
        
    except Exception as e:
        print(f"Erro no processador: {e}")
        return "❌ Erro ao processar os dados da reserva. Verifique se informou nome e datas corretamente."
# ================= ROTA API =================

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        pergunta = data.get("query", "").lower()
        
        # --- NOVO: Verificação de Lucro/Financeiro ---
        termos_financeiros = ["lucro", "faturamento", "total de reservas", "quanto ganhamos", "financeiro"]
        if any(termo in pergunta for termo in termos_financeiros):
            lucro, qtd = consultar_metricas_financeiras()
            resposta_financeira = f"💰 O lucro total atual é de R$ {lucro:,.2f}, com base em {qtd} reservas registradas no sistema."
            return jsonify({"response": resposta_financeira})
        # ---------------------------------------------

        resposta_ia = perguntar_ao_agente(pergunta)
        resultado_reserva = executar_reserva(resposta_ia)
        
        final_text = resultado_reserva if resultado_reserva else resposta_ia
        conversation_memory.append({"role": "user", "content": pergunta})
        conversation_memory.append({"role": "assistant", "content": final_text})

        return jsonify({"response": final_text})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"response": "Erro interno."}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)
