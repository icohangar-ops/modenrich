from playwright.sync_api import sync_playwright
import time, os, glob, shutil

output_dir = "/home/z/my-project/download"
os.makedirs(output_dir, exist_ok=True)

# Clean old recording
for f in glob.glob(os.path.join(output_dir, "*.webm")):
    os.remove(f)

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        record_video_dir=output_dir,
        record_video_size={"width": 1920, "height": 1080}
    )
    page = context.new_page()
    page.goto("file:///home/z/my-project/flair-enforcer-demo.html")
    # 10 slides * 16s = 160s + 5s buffer = 165s
    time.sleep(165)
    context.close()
    browser.close()

videos = glob.glob(os.path.join(output_dir, "*.webm"))
if videos:
    dst = os.path.join(output_dir, "flair-enforcer-demo.webm")
    shutil.move(videos[0], dst)
    size_mb = os.path.getsize(dst) / (1024 * 1024)
    print(f"DONE:{dst}:{size_mb:.1f}MB")
else:
    print("FAIL:NO_VIDEO")
