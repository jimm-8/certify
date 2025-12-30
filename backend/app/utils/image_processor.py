from rembg import remove
from PIL import Image
import io
import os

class ImageProcessor:
    """
    Handle image processing tasks like background removal
    """
    
    @staticmethod
    def remove_background(input_path: str, output_path: str = None) -> str:
        """
        Remove background from image using AI
        
        Args:
            input_path: Path to input image
            output_path: Path to save output (optional)
        
        Returns:
            Path to processed image
        """
        
        # If no output path specified, create one
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_nobg.png"
        
        try:
            # Open image
            with open(input_path, 'rb') as input_file:
                input_data = input_file.read()
            
            # Remove background using AI
            output_data = remove(input_data)
            
            # Save result
            with open(output_path, 'wb') as output_file:
                output_file.write(output_data)
            
            print(f"✅ Background removed: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"❌ Background removal failed: {e}")
            # If AI processing fails, return original image
            return input_path
    
    @staticmethod
    def optimize_signature(input_path: str, output_path: str = None, max_width: int = 400) -> str:
        """
        Optimize signature image:
        1. Remove background
        2. Resize if too large
        3. Convert to PNG
        
        Args:
            input_path: Path to input image
            output_path: Path to save output (optional)
            max_width: Maximum width in pixels
        
        Returns:
            Path to optimized image
        """
        
        # Generate output path if not provided
        if output_path is None:
            base_dir = os.path.dirname(input_path)
            filename = os.path.basename(input_path)
            name, _ = os.path.splitext(filename)
            output_path = os.path.join(base_dir, f"{name}_processed.png")
        
        try:
            # Step 1: Remove background
            with open(input_path, 'rb') as f:
                input_data = f.read()
            
            output_data = remove(input_data)
            
            # Step 2: Open as PIL Image
            img = Image.open(io.BytesIO(output_data))
            
            # Step 3: Resize if too large
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Step 4: Save as PNG
            img.save(output_path, 'PNG')
            
            print(f"✅ Signature optimized: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"❌ Optimization failed: {e}")
            # Return original if processing fails
            return input_path
    
    @staticmethod
    def create_preview(image_path: str, size: tuple = (200, 100)) -> str:
        """
        Create a small preview/thumbnail of the image
        
        Args:
            image_path: Path to image
            size: Thumbnail size (width, height)
        
        Returns:
            Path to thumbnail
        """
        
        try:
            img = Image.open(image_path)
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Save thumbnail
            base, ext = os.path.splitext(image_path)
            thumb_path = f"{base}_thumb.png"
            img.save(thumb_path, 'PNG')
            
            return thumb_path
            
        except Exception as e:
            print(f"❌ Thumbnail creation failed: {e}")
            return image_path