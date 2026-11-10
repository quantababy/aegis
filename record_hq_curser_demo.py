import os
import time
import shutil
from playwright.sync_api import sync_playwright
from PIL import Image

video_dir = r"C:\Users\quant\.gemini\antigravity\scratch\aegis\demo_video_hq"
os.makedirs(video_dir, exist_ok=True)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
app_url = "https://aegis-frontend-production-ab3c.up.railway.app"

CURSOR_INJECTION_JS = """
(() => {
    if (document.getElementById('aegis-mouse-pointer')) return;

    const style = document.createElement('style');
    style.innerHTML = `
        #aegis-mouse-pointer {
            position: fixed;
            top: 0;
            left: 0;
            width: 22px;
            height: 22px;
            pointer-events: none;
            z-index: 99999999;
            transform: translate(0px, 0px);
            transition: transform 0.04s cubic-bezier(0.2, 0.8, 0.2, 1);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }
        @keyframes aegis-click-pulse {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
        }
        .aegis-click-indicator {
            position: fixed;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid #22c55e;
            background: rgba(34, 197, 94, 0.25);
            pointer-events: none;
            z-index: 99999998;
            animation: aegis-click-pulse 0.45s ease-out forwards;
        }
    `;
    document.head.appendChild(style);

    const pointer = document.createElement('div');
    pointer.id = 'aegis-mouse-pointer';
    pointer.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#22c55e" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
        </svg>
    `;
    document.body.appendChild(pointer);

    window.addEventListener('mousemove', (e) => {
        pointer.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });

    window.addEventListener('mousedown', (e) => {
        const ring = document.createElement('div');
        ring.className = 'aegis-click-indicator';
        ring.style.left = `${e.clientX - 13}px`;
        ring.style.top = `${e.clientY - 13}px`;
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 450);
    }, { passive: true });
})();
"""

screenshots = []

def capture_step(page, name, wait_after=1.0):
    time.sleep(wait_after)
    shot_path = os.path.join(video_dir, f"{name}.png")
    page.screenshot(path=shot_path)
    screenshots.append(shot_path)
    print(f"Captured: {name}")

def human_move(page, target_x, target_y, steps=25, delay=0.015):
    page.mouse.move(target_x, target_y, steps=steps)
    time.sleep(delay * steps)

def smooth_scroll(page, start_y, end_y, steps=12, delay=0.05):
    for i in range(steps):
        curr_y = start_y + (end_y - start_y) * (i + 1) / steps
        page.evaluate(f"window.scrollTo(0, {curr_y})")
        time.sleep(delay)

def run():
    print("Recording High-Quality AEGIS Demo with Visible Human Cursor...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-gpu",
                "--force-device-scale-factor=1",
                "--window-size=1600,1000"
            ]
        )

        context = browser.new_context(
            viewport={"width": 1600, "height": 1000},
            record_video_dir=video_dir,
            record_video_size={"width": 1600, "height": 1000}
        )

        page = context.new_page()

        # Ingress to dashboard
        page.goto(app_url, wait_until="networkidle")
        page.evaluate(CURSOR_INJECTION_JS)
        time.sleep(2)

        # -------------------------------------------------------------
        # STEP 1: Executive Dashboard (0s - 7s)
        # -------------------------------------------------------------
        print("Step 1: Dashboard with visible cursor...")
        human_move(page, 550, 40) # Hover over top DEFCON shield pill
        time.sleep(1)
        human_move(page, 450, 200) # Hover over KPI Card 1
        time.sleep(0.8)
        human_move(page, 800, 200) # Hover over KPI Card 2
        time.sleep(0.8)
        smooth_scroll(page, 0, 280, steps=10, delay=0.04)
        time.sleep(1.2)
        smooth_scroll(page, 280, 0, steps=10, delay=0.04)
        capture_step(page, "01_dashboard_kpis", wait_after=0.5)

        # -------------------------------------------------------------
        # STEP 2: Attack Lineage & Interactive Node Inspection (7s - 17s)
        # -------------------------------------------------------------
        print("Step 2: Lineage Graph & Node Inspection...")
        human_move(page, 100, 200) # Move to sidebar 'Attack Lineage'
        time.sleep(0.5)
        page.click("a[href='/lineage']")
        time.sleep(2.5) # Wait for D3 force physics
        page.evaluate(CURSOR_INJECTION_JS)

        # Drag node inside SVG canvas
        svg = page.locator("svg").first
        if svg.is_visible():
            box = svg.bounding_box()
            if box:
                cx = box["x"] + box["width"] / 2
                cy = box["y"] + box["height"] / 2
                human_move(page, cx, cy, steps=20)
                page.mouse.down()
                human_move(page, cx + 140, cy - 80, steps=20)
                page.mouse.up()
                time.sleep(1.2)

        # Click on a specific node to open the Inspection Drawer
        circles = page.locator("svg circle")
        circle_count = circles.count()
        if circle_count > 0:
            target_node = circles.nth(min(3, circle_count - 1))
            box = target_node.bounding_box()
            if box:
                human_move(page, box["x"] + box["width"]/2, box["y"] + box["height"]/2)
                time.sleep(0.4)
                page.mouse.click(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
                time.sleep(2.5) # Inspection drawer slides out
                capture_step(page, "02_node_inspection_drawer", wait_after=0.5)

        # -------------------------------------------------------------
        # STEP 3: Defense Monitor & Live LLM Response Generation (17s - 32s)
        # -------------------------------------------------------------
        print("Step 3: Defense Monitor & LLM Completions...")
        human_move(page, 100, 280) # Move to sidebar 'Defense Monitor'
        time.sleep(0.5)
        page.click("a[href='/defense']")
        time.sleep(2)
        page.evaluate(CURSOR_INJECTION_JS)

        # 3a. Click 'Benign Query' button
        benign_btn = page.locator("button:has-text('Benign Query')").first
        send_btn = page.locator("button:has-text('Send')").first
        if benign_btn.is_visible():
            bbox = benign_btn.bounding_box()
            if bbox:
                human_move(page, bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2)
                time.sleep(0.4)
                benign_btn.click()
                time.sleep(0.8)

        # Click Send
        if send_btn.is_visible():
            bbox = send_btn.bounding_box()
            if bbox:
                human_move(page, bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2)
                time.sleep(0.4)
                send_btn.click()
                time.sleep(3.5) # Wait for LLM completion to stream into chat
                capture_step(page, "03_llm_response_generated", wait_after=0.5)

        # 3b. Click 'System Prompt Leak' attack button
        leak_btn = page.locator("button:has-text('System Prompt Leak')").first
        if leak_btn.is_visible():
            bbox = leak_btn.bounding_box()
            if bbox:
                human_move(page, bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2)
                time.sleep(0.4)
                leak_btn.click()
                time.sleep(0.8)

        # Click Send
        if send_btn.is_visible():
            bbox = send_btn.bounding_box()
            if bbox:
                human_move(page, bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2)
                time.sleep(0.4)
                send_btn.click()
                time.sleep(3.0) # Wait for 403 Forbidden card
                capture_step(page, "04_attack_blocked_403", wait_after=0.5)

        # -------------------------------------------------------------
        # STEP 4: Vulnerability Ledger & Ethereum Sepolia Proofs (32s - 42s)
        # -------------------------------------------------------------
        print("Step 4: Vulnerabilities & Ethereum Ledger...")
        human_move(page, 100, 240) # Move to sidebar 'Vulnerabilities'
        time.sleep(0.5)
        page.click("a[href='/vulnerabilities']")
        time.sleep(2)
        page.evaluate(CURSOR_INJECTION_JS)

        # Hover over the Ethereum Sepolia contract badge
        human_move(page, 400, 140)
        time.sleep(1)

        # Click on the first vulnerability row to inspect cryptographic proof
        vuln_rows = page.locator("table tbody tr, div[class*='cursor-pointer']")
        if vuln_rows.count() > 0:
            first_row = vuln_rows.first
            bbox = first_row.bounding_box()
            if bbox:
                human_move(page, bbox["x"] + 150, bbox["y"] + 25)
                time.sleep(0.5)
                first_row.click()
                time.sleep(2.5) # Modal / detail view opens with tx hash
                capture_step(page, "05_ethereum_blockchain_proof", wait_after=0.5)

        # -------------------------------------------------------------
        # STEP 5: Theme Switcher (42s - 46s)
        # -------------------------------------------------------------
        print("Step 5: Theme toggle...")
        theme_btn = page.locator("button[aria-label='Toggle theme']").first
        if theme_btn.is_visible():
            bbox = theme_btn.bounding_box()
            if bbox:
                human_move(page, bbox["x"] + bbox["width"]/2, bbox["y"] + bbox["height"]/2)
                time.sleep(0.4)
                theme_btn.click()
                time.sleep(1.8)
                capture_step(page, "06_theme_light", wait_after=0.5)
                theme_btn.click()
                time.sleep(1.8)
                capture_step(page, "07_theme_dark_oled", wait_after=0.5)

        # Finalize Video
        context.close()
        video_file = page.video.path() if page.video else None
        browser.close()

        print(f"Recorded video output: {video_file}")

        final_video = r"C:\Users\quant\.gemini\antigravity\scratch\aegis\aegis_master_demo_hq.webm"
        if video_file and os.path.exists(video_file):
            shutil.copyfile(video_file, final_video)
            size_mb = os.path.getsize(final_video) / (1024 * 1024)
            print(f"Master HQ Video saved: {final_video} ({size_mb:.2f} MB)")

        # Compile animated GIF
        if screenshots:
            gif_path = r"C:\Users\quant\.gemini\antigravity\scratch\aegis\aegis_master_demo_hq.gif"
            images = [Image.open(s) for s in screenshots]
            resized = [img.resize((1024, 640), Image.Resampling.LANCZOS) for img in images]
            resized[0].save(
                gif_path,
                save_all=True,
                append_images=resized[1:],
                duration=2000,
                loop=0
            )
            print(f"Master HQ GIF saved: {gif_path}")

if __name__ == "__main__":
    run()
