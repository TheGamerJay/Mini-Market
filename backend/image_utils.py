from PIL import Image, ImageOps


def compress_image(file_path, max_size=1200, quality=85):
    """Resize and compress an image in-place."""
    try:
        img = Image.open(file_path)
        img = ImageOps.exif_transpose(img)

        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        if img.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode in ("RGBA", "LA"):
                bg.paste(img, mask=img.split()[-1])
            else:
                bg.paste(img)
            img = bg

        img.save(file_path, "JPEG", quality=quality, optimize=True)
    except Exception as e:
        print(f"Image compression failed: {e}")
