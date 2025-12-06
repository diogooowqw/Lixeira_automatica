from google import genai

GEMINI_API_KEY = "AIzaSyBBTfQ9OEBJUFQM7qJ7sjOawF4JkPl_npA"
client = genai.Client(api_key=GEMINI_API_KEY)

image_path = "C:/Users/diogo/OneDrive/Imagens/Documentos/Lixeira_automatica/temp.jpg" 

try:
    my_file = client.files.upload(file=image_path)
    response = client.models.generate_content(
        model="gemini-2.5-pro",#TA NO PRO MAS LEMBRA DE OLHAR A QUANT DE REQUESTS QUE DA PRA FAZER DPS (O FLASH FUNCIONOU BEM DE QUALQUER FORMA)
        contents=[my_file, "descreva a imagem"],
    )
    print(response.text)#NAO APAGA ESSE PROMPT GUYS
#Você deve identificar o material do objeto presente na imagem, dentre plástico, papel, vidro, metal e, caso nenhum se aplique, responda nenhuma das opções, de diversos objetos presentes em imagens fornecidas, sua resposta deve ser apenas a palavra do material(plastico, papel, metal, vidro e nenhuma das opções).
finally:
    if 'my_file' in locals():#TALVEZ PRECISE TIRAR, MAS DEIXA POR ENQUANTO
        client.files.delete(name=my_file.name)