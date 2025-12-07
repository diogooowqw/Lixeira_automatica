from google import genai

GEMINI_API_KEY = "AIzaSyDfkn1W9eVArHvtlAS6Lbcd4E285cQ_jrI"

client = genai.Client(api_key=GEMINI_API_KEY)

image_path = "C:/Users/diogo/OneDrive/Imagens/Documentos/Lixeira_automatica/temp.jpg" 

try:
    my_file = client.files.upload(file=image_path)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[my_file,
     "Você deve identificar o material do objeto presente na imagem, " 
     "dentre plástico, papel, vidro, metal e, caso nenhum se aplique, "
     "responda nenhuma das opções, de objetos presentes em imagens fornecidas, "
     "sua resposta deve ser apenas o numero referente ao material "
     "(metal=1 vidro=2 papel=3 plastico=4 e nenhuma das opções=5). Fale o que é o material no final (exemplo: lapis, dinheiro, etc)."],
    )
    print(response.text)#NAO APAGA ESSE PROMPT GUYS
finally:
    if 'my_file' in locals():#TALVEZ PRECISE TIRAR, MAS DEIXA POR ENQUANTO
        client.files.delete(name=my_file.name)
        
        