from pathlib import Path

from PIL import Image, ImageOps


source_path = Path(
    r"C:\Users\admin\AppData\Local\Temp\codex-clipboard-60d5ca79-62ce-4961-955c-3aace994c971.png"
)
implementation_path = Path(
    r"C:\Users\admin\Documents\ChatGPT\大查房\work\local-card-deck\home-card-deck-390x844.png"
)
output_path = Path(
    r"C:\Users\admin\Documents\ChatGPT\大查房\work\local-card-deck\card-deck-design-comparison.png"
)

source = Image.open(source_path).convert("RGB")
implementation = Image.open(implementation_path).convert("RGB")
implementation_crop = implementation.crop((0, 185, 390, 660))

source = ImageOps.contain(source, (663, 475), Image.Resampling.LANCZOS)
implementation_crop = ImageOps.contain(
    implementation_crop,
    (390, 475),
    Image.Resampling.LANCZOS,
)

gap = 24
canvas = Image.new(
    "RGB",
    (source.width + gap + implementation_crop.width, 475),
    "white",
)
canvas.paste(source, (0, 0))
canvas.paste(implementation_crop, (source.width + gap, 0))
canvas.save(output_path, optimize=True)

print(output_path)
