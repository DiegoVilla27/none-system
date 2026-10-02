from PIL import Image, ImageDraw, ImageFont
import os

width, height = 400, 600
image = Image.new("RGB", (width, height), color="white")
draw = ImageDraw.Draw(image)

text_lines = [
    "================================",
    "        MERCADONA, S.A.        ",
    "       CIF: A-46103834         ",
    "   C/ Gran Via 45, Madrid       ",
    "================================",
    "FECHA: 15/03/2026   HORA: 14:32 ",
    "TICKET: 042-9982                ",
    "--------------------------------",
    "DESCRIPCION             IMPORTE ",
    "--------------------------------",
    "LECHE ENTERA 1L            1.15 ",
    "PAN DE MOLDE               1.40 ",
    "PLATANO DE CANARIAS        2.85 ",
    "PECHUGA POLLO 500G         4.90 ",
    "--------------------------------",
    "BASE IMPONIBLE:            9.27 ",
    "IVA (10%):                 1.03 ",
    "================================",
    "TOTAL A PAGAR:        10.30 EUR ",
    "================================",
    "   TARJETA BANCARIA: **** 4492  ",
    "     ¡GRACIAS POR SU COMPRA!    ",
    "================================",
]

y = 30
for line in text_lines:
    draw.text((30, y), line, fill="black")
    y += 22

output_path = os.path.join(os.path.dirname(__file__), "sample-ticket.png")
image.save(output_path, "PNG")
print(f"Sample ticket generated at: {output_path}")
