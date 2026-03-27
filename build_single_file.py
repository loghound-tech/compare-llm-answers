import os
import re

def build_single_file(html_file, css_file, js_file, output_file):
    # Read the contents of the files
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    with open(css_file, 'r', encoding='utf-8') as f:
        css_content = f.read()
        
    with open(js_file, 'r', encoding='utf-8') as f:
        js_content = f.read()

    # Create the injected tags
    style_tag = f"<style>\n{css_content}\n</style>"
    script_tag = f"<script>\n{js_content}\n</script>"

    # Replace the stylesheet link with the inline <style> tag
    # This regex looks for a link tag referencing styles.css
    html_content = re.sub(r'<link\s+[^>]*href=["\']styles\.css["\'][^>]*>', lambda m: style_tag, html_content)
    
    # Replace the script tag with the inline <script> tag
    # This regex looks for a script tag referencing app.js
    html_content = re.sub(r'<script\s+[^>]*src=["\']app\.js["\'][^>]*>\s*</script>', lambda m: script_tag, html_content)

    # Write the combined result to the output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"Successfully created: {output_file}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    html_file = os.path.join(current_dir, "index.html")
    css_file = os.path.join(current_dir, "styles.css")
    js_file = os.path.join(current_dir, "app.js")
    output_file = os.path.join(current_dir, "single_index.html")
    
    # Ensure required files exist before trying to read them
    if os.path.exists(html_file) and os.path.exists(css_file) and os.path.exists(js_file):
        build_single_file(html_file, css_file, js_file, output_file)
    else:
        print("Error: Missing one or more input files (index.html, styles.css, app.js).")
