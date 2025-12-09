#!/usr/bin/env python3
"""
Script to extract playlist variants from URLs in a text file
"""

import re
import sys
from typing import List

def extract_variants(channel_name: str, url: str, logo_url: str = "") -> str:
    """
    Given a channel name and playlist URL, extract and return all variants
    
    Args:
        channel_name: The channel name (e.g., "vtv1", "vtv2")
        url: A full playlist URL like:
        https://vtvgolive-ssaimh.vtvdigital.vn/T5DrmmF1Br_y7fy8oVj1_w/1765287788/manifest/vtv2/playlist_720p.m3u8
        logo_url: Optional logo URL for the channel
    
    Returns:
        A string containing all variants with their metadata
    """
    
    # Extract components from URL
    # Pattern: ...manifest/{channel}/playlist_{quality}.m3u8
    match = re.search(r'manifest/[^/]+/playlist_(\d+p)\.m3u8', url)
    
    if not match:
        return None
    
    base_url = url[:match.start()]  # Everything before "manifest/"
    
    # Define available qualities
    qualities = [
        ("360p", "360p"),
        ("480p", "480p"),
        ("720p", "720p"),
    ]
    
    result = []
    
    for quality, display_quality in qualities:
        tvg_id = f'{channel_name}@{quality}'
        channel_display = f'{channel_name} ({display_quality})'
        
        # Build EXTINF line with tvg-logo if provided
        if logo_url:
            extinf = f'#EXTINF:-1 tvg-id="{tvg_id}",{channel_display}, tvg-logo="{logo_url}"'
        else:
            extinf = f'#EXTINF:-1 tvg-id="{tvg_id}",{channel_display}'
        
        playlist_url = f'{base_url}manifest/{channel_name}/playlist_{quality}.m3u8'
        
        result.append(extinf)
        result.append(playlist_url)
    
    return '\n'.join(result)


def process_file(input_filename: str, output_filename: str = "output.m3u") -> None:
    """
    Read channel names, URLs, and optional logos from a text file, process each one, and write to output file
    Format: channel_name, url, and optional logo_url (one per line, separated by blank lines or groups)
    
    Args:
        input_filename: Path to the text file containing channel names and URLs
        output_filename: Path to the output file (default: output.m3u)
    """
    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        results = []
        i = 0
        
        while i < len(lines):
            channel_line = lines[i].strip()
            i += 1
            
            # Skip empty lines and comments
            if not channel_line or channel_line.startswith('#'):
                continue
            
            # Check if next line is a logo URL
            logo_url = ""
            if i < len(lines):
                first_url = lines[i].strip()
                i += 1
                
                # If first URL doesn't contain 'playlist', it's a logo URL
                if first_url.startswith('http') and 'playlist' not in first_url:
                    logo_url = first_url
                    # Now get the actual playlist URL
                    if i < len(lines):
                        playlist_url = lines[i].strip()
                        i += 1
                    else:
                        continue
                else:
                    # First URL is the playlist URL
                    playlist_url = first_url
                
                output = extract_variants(channel_line, playlist_url, logo_url)
                if output:
                    results.append(output)
                    results.append("")  # Empty line for separation
        
        # Prepare header with the requested EXTINF line
        header = '#EXTINF:-1 tvg-id="vtv1@360p",vtv1 (360p), tvg-logo="https://vtvgo-images.vtvdigital.vn/images/20230626/f161041d-3a3f-4c0a-88f2-ae97f8052ee7.jpg"'
        
        # Write to output file
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(header + '\n')
            f.write('\n'.join(results))
        
        print(f"Output written to: {output_filename}")
        print(f"Total channels processed: {len([r for r in results if r.startswith('#')])}")
    
    except FileNotFoundError:
        print(f"Error: File '{input_filename}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Nhập đường dẫn file txt tại đây
    input_file = "python/urls.txt"
    output_file = "python/output.m3u"
    
    process_file(input_file, output_file)
