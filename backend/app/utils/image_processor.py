from PIL import Image
import os


class ImageProcessor:
    """
    Handle basic image processing tasks (no AI background removal).
    """

    @staticmethod
    def remove_background(input_path: str, output_path: str = None) -> str:
        """
        Compatibility method.
        Background removal is disabled and this returns the original image path.
        """
        return input_path

    @staticmethod
    def optimize_signature(input_path: str, output_path: str = None, max_width: int = 400) -> str:
        """
        Optimize signature image:
        1. Normalize to RGBA PNG
        2. Resize if too large

        Args:
            input_path: Path to input image
            output_path: Path to save output (optional)
            max_width: Maximum width in pixels

        Returns:
            Path to processed image
        """

        if output_path is None:
            base_dir = os.path.dirname(input_path)
            filename = os.path.basename(input_path)
            name, _ = os.path.splitext(filename)
            output_path = os.path.join(base_dir, f"{name}_processed.png")

        try:
            img = Image.open(input_path)

            # Force a consistent output mode.
            if img.mode != "RGBA":
                img = img.convert("RGBA")

            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            img.save(output_path, "PNG")
            print(f"Signature processed: {output_path}")
            return output_path

        except Exception as exc:
            print(f"Signature processing failed: {exc}")
            return input_path

    @staticmethod
    def create_preview(image_path: str, size: tuple = (200, 100)) -> str:
        """
        Create a small preview/thumbnail of the image.
        """
        try:
            img = Image.open(image_path)
            img.thumbnail(size, Image.Resampling.LANCZOS)

            base, _ = os.path.splitext(image_path)
            thumb_path = f"{base}_thumb.png"
            img.save(thumb_path, "PNG")
            return thumb_path

        except Exception as exc:
            print(f"Thumbnail creation failed: {exc}")
            return image_path
