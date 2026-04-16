import os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODELO = "llama-3.3-70b-versatile"

app = Flask(__name__)
CORS(app)

# PROMPT ULTRA-DIRETO
SYSTEM_PROMPT = """
Você é o atendente da RM ESPAÇOS & EVENTOS.
Trabalhamos com 50% pra garantir a reserva e 50% no dia da entrega da chave.
valor da diaria é 300,00 reais, o valor da taxa de limpeza é 50,00 reais.

REGRAS DE CÁLCULO:
1. O valor da diária é fixo em R$ 300,00.
2. Lucro = (Número de Dias) * 300.
3. Considere que se o cliente entra no sábado e sai no domingo, isso conta como 2 dias de uso (ou conforme sua regra de negócio).

4. O que e proibido: Não permitimos paredão, o som somente o do casa, manter limpo o ambiente do jeito q foi entregue ou então pagar uma taxa de limpeza valor R$50,00
,na quebre de objetos o cliente tem que pagar o valor do objeto.
OBJETIVO: Agendar reservas no sistema.

REGRAS RÍGIDAS:
1. Verifique se a data está livre nas 'Ocupadas'. Se estiver, avise e peça outra.
2. Se estiver livre, peça o NOME COMPLETO.
3. Assim que tiver o NOME e a DATA, NÃO CONVERSE. Sua resposta deve ser apenas o comando abaixo.

FORMATO OBRIGATÓRIO (NÃO ADICIONE TEXTO ANTES OU DEPOIS):
CRIAR_RESERVA | nome: <nome>, inicio: <YYYY-MM-DD>, fim: <YYYY-MM-DD>
"""

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_input = data.get("query")
        reservas_atuais = data.get("reservasAtuais", [])
        historico = data.get("historico", []) # Essencial para memória

        # Prepara contexto de disponibilidade
        txt_ocupadas = "\n".join([f"- {r['nome']}: {r['dataInicio']} até {r['dataFim']}" for r in reservas_atuais])
        contexto = f"\n\nHOJE: {datetime.now().strftime('%Y-%m-%d')}\nOCUPADAS:\n{txt_ocupadas or 'Nenhuma'}"

        messages = [{"role": "system", "content": SYSTEM_PROMPT + contexto}]
        
        # Reconstrói a memória da conversa
        for msg in historico:
            role = "user" if msg["role"] == "user" else "assistant"
            if "CRIAR_RESERVA" not in msg["text"]: # Limpa comandos antigos do histórico
                messages.append({"role": role, "content": msg["text"]})
            
        messages.append({"role": "user", "content": user_input})

        completion = client.chat.completions.create(
            model=MODELO,
            messages=messages,
            temperature=0 # Zero para não inventar conversa
        )

        ai_response = completion.choices[0].message.content
        print(f"DEBUG IA: {ai_response}")

        if "CRIAR_RESERVA" in ai_response:
            try:
                # Extração robusta dos dados
                extraido = ai_response.split("CRIAR_RESERVA")[-1].replace("|", "").strip()
                dict_res = {}
                for par in extraido.split(","):
                    if ":" in par:
                        k, v = par.split(":", 1)
                        dict_res[k.strip().lower()] = v.strip()

                return jsonify({
                    "response": f"Confirmado! Reservando para {dict_res.get('nome')}.",
                    "agendar": True,
                    "dados": {
                        "nome": dict_res.get("nome"),
                        "dataInicio": dict_res.get("inicio"),
                        "dataFim": dict_res.get("fim")
                    }
                })
            except Exception as e:
                print(f"Erro no parse: {e}")

        return jsonify({"response": ai_response})

    except Exception as e:
        return jsonify({"response": "Erro interno."}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)