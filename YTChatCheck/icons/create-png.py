#!/usr/bin/env python3
"""Create simple valid PNG icons for the extension."""
import struct
import zlib

def create_png(width, height, color_bg=(26, 115, 232), color_fg=(255, 255, 255)):
    """Create a simple PNG with a colored background."""
    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

    # Create simple image data - solid background color
    # Each row: filter byte (0) + RGB pixels
    row_data = bytes([0]) + bytes([color_bg[0], color_bg[1], color_bg[2]]) * width
    raw_data = row_data * height
    compressed = zlib.compress(raw_data, 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
    idat_chunk = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)

    # IEND chunk
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

    return png_signature + ihdr_chunk + idat_chunk + iend_chunk

# Generate icons
sizes = [16, 32, 48, 128]
for size in sizes:
    png_data = create_png(size, size)
    with open(f'icon{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Created icon{size}.png ({len(png_data)} bytes)')