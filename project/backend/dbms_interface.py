#!/usr/bin/env python3
"""
Alumni Atlas DBMS - Web-based SQL Interface
==========================================
Web-based database management system for alumni records and moderation
"""

import http.server
import socketserver
import json
import sqlite3
import urllib.parse
from typing import Dict, Any
import uuid
import html
import threading
import os
import shutil

def _choose_database_path() -> str:
    # Allow override via env var
    env_path = os.environ.get("ALUMNI_DB")
    if env_path and os.path.isfile(env_path):
        return os.path.abspath(env_path)

    backend_dir = os.path.dirname(__file__)
    root_db = os.path.abspath(os.path.join(backend_dir, '..', 'alumni.db'))
    backend_db = os.path.abspath(os.path.join(backend_dir, 'alumni.db'))

    def count_rows(db_path: str) -> int:
        try:
            if not os.path.isfile(db_path):
                return -1
            con = sqlite3.connect(db_path)
            cur = con.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='alumni'")
            if not cur.fetchone():
                return -1
            cur.execute("SELECT COUNT(*) FROM alumni")
            cnt = cur.fetchone()[0]
            return int(cnt)
        except Exception:
            return -1
        finally:
            try:
                con.close()
            except Exception:
                pass

    counts = {root_db: count_rows(root_db), backend_db: count_rows(backend_db)}
    # Prefer the DB with the larger count; tie-breaker: root_db
    chosen = root_db if counts.get(root_db, -1) >= counts.get(backend_db, -1) else backend_db

    # Optional: keep both files in sync by copying newer (larger) into the other
    try:
        other = backend_db if chosen == root_db else root_db
        c_chosen = counts.get(chosen, -1)
        c_other = counts.get(other, -1)
        if c_chosen >= 0 and c_other >= 0 and c_chosen != c_other:
            shutil.copy2(chosen, other)
    except Exception:
        # Non-fatal if copy fails
        pass
    return chosen

DATABASE_PATH = _choose_database_path()

def _ensure_schema(db_path: str):
    try:
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS alumni (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                program TEXT NOT NULL,
                graduation_year INTEGER NOT NULL,
                job_title TEXT NOT NULL,
                company TEXT NOT NULL,
                location TEXT NOT NULL,
                linkedin TEXT,
                twitter TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Moderation: pending join requests table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS pending_requests (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                program TEXT NOT NULL,
                graduation_year INTEGER NOT NULL,
                job_title TEXT NOT NULL,
                company TEXT NOT NULL,
                location TEXT NOT NULL,
                linkedin TEXT,
                twitter TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'pending'
            )
        ''')
        con.commit()
    finally:
        try:
            con.close()
        except Exception:
            pass

def _bootstrap_alumni_from_json_if_needed(db_path: str):
    """Ensure the 20 actual alumni exist. Inserts records from data/alumni.json using INSERT OR IGNORE.
    Does not delete user data; safe to run multiple times.
    """
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'alumni.json')
    if not os.path.isfile(data_path):
        return
    try:
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute("SELECT COUNT(*) FROM alumni")
        current = int(cur.fetchone()[0])
        # Always insert-or-ignore these 20 to guarantee presence without duplication
        with open(data_path, 'r', encoding='utf-8') as f:
            records = json.load(f)
        for a in records:
            cur.execute('''
                INSERT OR IGNORE INTO alumni (
                    id, name, email, program, graduation_year, job_title,
                    company, location, linkedin, twitter, latitude, longitude
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()),
                a['name'], a['email'], a['program'], a['graduation_year'], a['job_title'],
                a['company'], a['location'], a.get('linkedin', ''), a.get('twitter', ''),
                float(a['latitude']), float(a['longitude'])
            ))
        con.commit()
    except Exception:
        pass
    finally:
        try:
            con.close()
        except Exception:
            pass

# Ensure schema and bootstrap actual alumni data at startup
_ensure_schema(DATABASE_PATH)
_bootstrap_alumni_from_json_if_needed(DATABASE_PATH)

class DBMSHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/' or self.path.startswith('/?'):
            self.serve_dbms_interface()
        elif self.path == '/alumni':
            self.get_alumni()
        elif self.path == '/pending':
            try:
                conn = sqlite3.connect(DATABASE_PATH)
                cur = conn.cursor()
                cur.execute('''
                    SELECT id, name, email, program, graduation_year, job_title, company, location,
                           linkedin, twitter, latitude, longitude, submitted_at, status
                    FROM pending_requests
                    WHERE status = 'pending'
                    ORDER BY submitted_at ASC
                ''')
                rows = cur.fetchall()
                conn.close()
                pending = []
                for r in rows:
                    pending.append({
                        "id": r[0],
                        "name": r[1],
                        "email": r[2],
                        "program": r[3],
                        "graduationYear": r[4],
                        "jobTitle": r[5],
                        "company": r[6],
                        "location": r[7],
                        "linkedin": r[8],
                        "twitter": r[9],
                        "latitude": r[10],
                        "longitude": r[11],
                        "submittedAt": r[12],
                        "status": r[13],
                    })
                self.send_json_response({"pending": pending})
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path == '/alumni/count':
            try:
                conn = sqlite3.connect(DATABASE_PATH)
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM alumni")
                cnt = cur.fetchone()[0]
                conn.close()
                self.send_json_response({"count": cnt})
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path == '/tables':
            self.get_tables()
        elif self.path.startswith('/sql?'):
            self.execute_sql_get()
        elif self.path == '/__db__':
            # Report which DB is being used and row count
            try:
                conn = sqlite3.connect(DATABASE_PATH)
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM alumni")
                cnt = cur.fetchone()[0]
                # Report both paths if present
                backend_dir = os.path.dirname(__file__)
                root_db = os.path.abspath(os.path.join(backend_dir, '..', 'alumni.db'))
                backend_db = os.path.abspath(os.path.join(backend_dir, 'alumni.db'))
                def _count(db):
                    try:
                        c=sqlite3.connect(db)
                        cc=c.cursor()
                        cc.execute("SELECT COUNT(*) FROM alumni")
                        v=cc.fetchone()[0]
                        c.close()
                        return v
                    except Exception:
                        return None
                root_count = _count(root_db) if os.path.isfile(root_db) else None
                backend_count = _count(backend_db) if os.path.isfile(backend_db) else None
            except Exception as e:
                cnt = None
                root_count = None
                backend_count = None
            finally:
                try:
                    conn.close()
                except Exception:
                    pass
            self.send_json_response({
                "database_path": DATABASE_PATH,
                "alumni_count": cnt,
                "root_db": root_db if 'root_db' in locals() else None,
                "root_count": root_count,
                "backend_db": backend_db if 'backend_db' in locals() else None,
                "backend_count": backend_count
            })
        elif self.path == '/__version__':
            self.send_json_response({
                "build": "center-out-borders v1.0",
                "port": self.server.server_address[1],
                "db": DATABASE_PATH
            })
        elif self.path == '/__shutdown__':
            # Gracefully shut down the server for same-port restarts
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"Shutting down server...")
            threading.Thread(target=self.server.shutdown, daemon=True).start()
        else:
            self.send_error_response(404, "Not found")

    def do_POST(self):
        if self.path == '/sql':
            self.execute_sql_post()
        elif self.path == '/alumni':
            self.create_alumni()
        elif self.path == '/join':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode())
                req_id = str(uuid.uuid4())
                conn = sqlite3.connect(DATABASE_PATH)
                cur = conn.cursor()
                cur.execute('''
                    INSERT INTO pending_requests (
                        id, name, email, program, graduation_year, job_title, company, location,
                        linkedin, twitter, latitude, longitude
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    req_id,
                    data['name'], data['email'], data['program'], int(data['graduationYear']), data['jobTitle'],
                    data['company'], data['location'], data.get('linkedin'), data.get('twitter'),
                    float(data.get('latitude') or 0.0), float(data.get('longitude') or 0.0)
                ))
                conn.commit()
                conn.close()
                self.send_json_response({"queued": True, "id": req_id}, 201)
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path.startswith('/pending/') and self.path.endswith('/accept'):
            try:
                req_id = self.path.split('/')[-2]
                conn = sqlite3.connect(DATABASE_PATH)
                cur = conn.cursor()
                cur.execute("SELECT id, name, email, program, graduation_year, job_title, company, location, linkedin, twitter, latitude, longitude FROM pending_requests WHERE id = ? AND status = 'pending'", (req_id,))
                row = cur.fetchone()
                if not row:
                    conn.close()
                    self.send_error_response(404, "Pending request not found")
                    return
                alumni_id = str(uuid.uuid4())
                cur.execute('''
                    INSERT INTO alumni (id, name, email, program, graduation_year, job_title, company, location, linkedin, twitter, latitude, longitude)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    alumni_id, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11]
                ))
                cur.execute("UPDATE pending_requests SET status = 'accepted' WHERE id = ?", (req_id,))
                conn.commit()
                conn.close()
                self.send_json_response({"accepted": True, "alumniId": alumni_id, "pendingId": req_id})
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path.startswith('/pending/') and self.path.endswith('/reject'):
            try:
                req_id = self.path.split('/')[-2]
                conn = sqlite3.connect(DATABASE_PATH)
                cur = conn.cursor()
                cur.execute("UPDATE pending_requests SET status = 'rejected' WHERE id = ? AND status = 'pending'", (req_id,))
                if cur.rowcount == 0:
                    conn.close()
                    self.send_error_response(404, "Pending request not found")
                    return
                conn.commit()
                conn.close()
                self.send_json_response({"rejected": True, "pendingId": req_id})
            except Exception as e:
                self.send_error_response(500, str(e))
        else:
            self.send_error_response(404, "Not found")

    def do_DELETE(self):
        # Support DELETE /alumni/<id>
        if self.path.startswith('/alumni/'):
            alumni_id = self.path.split('/')[-1]
            try:
                conn = sqlite3.connect(DATABASE_PATH)
                cur = conn.cursor()
                cur.execute("DELETE FROM alumni WHERE id = ?", (alumni_id,))
                affected = cur.rowcount
                conn.commit()
                conn.close()
                if affected == 0:
                    self.send_error_response(404, "Alumni not found")
                else:
                    self.send_json_response({"deleted": True, "id": alumni_id})
            except Exception as e:
                self.send_error_response(500, str(e))
        else:
            self.send_error_response(404, "Not found")

    def serve_dbms_interface(self):
        """Serve the DBMS web interface"""
        html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alumni Atlas DBMS</title>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    /* BUILD: center-out-borders v1.0 (2025-08-10) */
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #3b82f6;
            --primary-dark: #2563eb;
            --secondary: #64748b;
            --accent: #06b6d4;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --border: #374151;
            --border-light: #4b5563;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            background: linear-gradient(135deg, var(--bg-primary) 0%, #0c1425 100%);
            color: var(--text-primary); 
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container { 
            max-width: 1600px; 
            margin: 0 auto; 
            padding: 24px;
        }
        
        .header { 
            /* Clean panel with animated gradient borders using real elements */
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            padding: 32px 0; 
            text-align: center; 
            margin-bottom: 32px;
            border-radius: 16px;
            box-shadow: var(--shadow-xl);
            position: relative;
            overflow: hidden;
        }
        .build-tag {
            position: absolute;
            top: 8px;
            right: 12px;
            background: rgba(15, 23, 42, 0.6);
            color: var(--text-secondary);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 12px;
            padding: 4px 8px;
            z-index: 12;
            pointer-events: none;
        }
        
        /* Seamless gradient ring overlay for header (hover-only) */
        .header::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: conic-gradient(from 90deg, var(--primary), var(--accent), var(--success), var(--primary));
            padding: 3px; /* border thickness */
            /* Mask out the inner area to create a ring */
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask-composite: exclude;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
            z-index: 12;
            will-change: opacity;
        }

        .header .border-animation {
            position: absolute;
            bottom: -2px; /* deeper under bottom rounding */
            left: 50%;
            width: calc(100% + 6px); /* extra bleed into corners */
            height: 3px;
            background: linear-gradient(90deg, var(--primary), var(--accent), var(--success), var(--primary));
            transform: translateX(-50%) scaleX(0);
            transform-origin: center;
            transition: transform 0.35s ease, opacity 0.2s ease;
            z-index: 10;
            opacity: 0;
            pointer-events: none;
            will-change: transform, opacity;
        }

        .header .side-border {
            position: absolute;
            bottom: -2px; /* extend further to avoid seams */
            width: 3px;
            height: calc(100% + 6px); /* extra bleed into top corners */
            background: linear-gradient(180deg, var(--accent), var(--primary));
            transform: scaleY(0);
            transform-origin: bottom;
            transition: transform 0.35s ease 0.25s, opacity 0.2s ease 0.25s;
            opacity: 0;
            z-index: 10;
            pointer-events: none;
            will-change: transform, opacity;
        }
        .header .side-border.left { left: 0; border-top-left-radius: inherit; }
        .header .side-border.right { right: 0; border-top-right-radius: inherit; }

        .header:hover .border-animation {
            transform: translateX(-50%) scaleX(1);
            opacity: 1;
        }

        .header:hover .side-border {
            transform: scaleY(1);
            opacity: 1;
        }
    .header:hover::after { opacity: 1; }

    /* Disable legacy animated strips to avoid lingering edges */
    .header .border-animation,
    .header .side-border,
    .stat-card .border-animation,
    .stat-card .side-border { display: none !important; }
        
        .header h1 { 
            color: var(--text-primary); 
            font-size: 2.5rem; 
            font-weight: 700; 
            margin-bottom: 8px;
            letter-spacing: -0.025em;
            position: relative;
        }
        
        .header .subtitle { 
            color: var(--text-secondary); 
            font-size: 1.125rem; 
            font-weight: 400;
            margin-bottom: 20px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .main-content { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 32px;
            margin-bottom: 32px;
        }
        
        @media (max-width: 1200px) {
            .main-content { grid-template-columns: 1fr; }
        }
        
        .panel {
            background: var(--bg-secondary);
            border-radius: 16px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .panel:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-xl);
            border-color: var(--border-light);
        }
        
        .panel-header {
            padding: 24px 32px;
            background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .panel-header h2 { 
            color: var(--text-primary); 
            font-size: 1.5rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .panel-header .icon {
            font-size: 1.25rem;
        }
        
        .panel-content {
            padding: 32px;
        }
        
        .sql-panel .panel-content {
            padding: 32px;
        }
        
        #sqlQuery {
            width: 100%;
            height: 200px;
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.6;
            resize: vertical;
            outline: none;
            transition: all 0.3s ease;
        }
        
        #sqlQuery:focus { 
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        #sqlQuery::placeholder {
            color: var(--text-muted);
        }
        
        .button-group { 
            margin: 24px 0;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            align-items: stretch;
        }
    .button-group .btn { width: 100%; justify-content: center; padding: 10px 14px; font-size: 13px; white-space: nowrap; gap: 2px; }
    .button-group .btn .icon { width: 16px; height: 16px; margin-right: 0; vertical-align: middle; }
        @media (max-width: 1100px) {
            .button-group { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
            .button-group { grid-template-columns: 1fr; }
        }
        
        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 14px 24px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            position: relative;
            overflow: hidden;
            will-change: transform;
            line-height: 1;
        }
        
        .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        
        .btn:hover::before {
            left: 100%;
        }
        
        .btn:hover { 
            background: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: var(--shadow-lg);
        }
        
        .btn:active {
            transform: translateY(0);
        }
    .btn.small { padding: 8px 12px; font-size: 12px; }
    /* Icon styling inside buttons */
    .btn .icon { width: 16px; height: 16px; margin-right: 0; display: inline-block; vertical-align: middle; }
    .btn .icon-lg { width: 18px; height: 18px; }
    .btn span, .btn svg.icon { transition: transform 0.2s ease; }
    /* Nudge only the Describe Schema icon down slightly for baseline alignment */
    button[onclick="describeAlumni()"] .icon { transform: translateY(2px); }
        
        .btn.danger { background: var(--error); }
        .btn.danger:hover { background: #dc2626; }
        .btn.success { background: var(--success); }
        .btn.success:hover { background: #059669; }
        .btn.secondary { 
            background: var(--bg-tertiary); 
            color: var(--text-primary);
        }
        .btn.secondary:hover { 
            background: var(--secondary); 
        }
        
        .quick-queries { 
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
        }
        
        .quick-queries h3 {
            color: var(--text-primary);
            margin-bottom: 16px;
            font-size: 1.125rem;
            font-weight: 600;
        }
        
        .quick-queries-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 12px;
        }
        
        .quick-query {
            background: var(--bg-primary);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-family: 'JetBrains Mono', monospace;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .quick-query:hover { 
            background: var(--primary);
            color: white;
            border-color: var(--primary);
            transform: translateY(-1px);
        }
        
        .results-panel {
            background: var(--bg-secondary);
        }

        /* Enlarge (fullscreen-like) view for Query Results */
        .results-panel.enlarged {
            position: fixed;
            inset: 16px;
            z-index: 1000;
            max-width: none;
            width: calc(100% - 32px);
            height: calc(100% - 32px);
        }
        .results-panel.enlarged .panel-content {
            height: calc(100% - 80px);
            display: flex;
            flex-direction: column;
        }
        .results-panel.enlarged #results {
            height: 100%;
        }
        
        #results {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            height: 500px;
            overflow-y: auto;
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        #results::-webkit-scrollbar {
            width: 8px;
        }
        
        #results::-webkit-scrollbar-track {
            background: var(--bg-tertiary);
            border-radius: 4px;
        }
        
        #results::-webkit-scrollbar-thumb {
            background: var(--secondary);
            border-radius: 4px;
        }
        
        #results::-webkit-scrollbar-thumb:hover {
            background: var(--border-light);
        }

        /* Grey placeholder text in Query Results (matches SQL console tone) */
        .results-placeholder {
            color: var(--text-muted);
        }
        
        .table-data {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow);
        }
        
        .table-data th, .table-data td {
            border: none;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }
        
        .table-data th {
            background: var(--bg-tertiary);
            color: var(--primary);
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .table-data td {
            background: var(--bg-secondary);
            color: var(--text-secondary);
        }
        
        .table-data tr:hover td { 
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }
        
        .table-data tr:last-child td {
            border-bottom: none;
        }
        
        .status { 
            padding: 16px 20px; 
            margin: 16px 0; 
            border-radius: 10px; 
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
        }
        
        .status.success { 
            background: rgba(16, 185, 129, 0.1); 
            color: var(--success);
            border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .status.error { 
            background: rgba(239, 68, 68, 0.1); 
            color: var(--error);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .status.info { 
            background: rgba(59, 130, 246, 0.1); 
            color: var(--primary);
            border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            padding: 42px; /* increased from 28px (~1.5x height) */
            min-height: 160px; /* ensure visibly larger card area */
            border-radius: 16px;
            text-align: center;
            box-shadow: var(--shadow);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        /* Make stat-card icons much larger for visual emphasis */
        .stat-card .icon {
            font-size: 3.25rem; /* was implicit ~1rem; now much larger */
            line-height: 1;
            margin-bottom: 10px;
            display: inline-block;
        }

    /* Remove separate top line; ring overlay will cover it */
    .stat-card::before { content: none; }
        
        /* Seamless gradient ring overlay for stat-cards (hover-only) */
        .stat-card::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: conic-gradient(from 90deg, var(--primary), var(--accent), var(--success), var(--primary));
            padding: 3px; /* border thickness */
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask-composite: exclude;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
            z-index: 12;
            will-change: opacity;
        }
        
        .stat-card .border-animation {
            position: absolute;
            bottom: -2px;
            left: 50%;
            width: calc(100% + 6px);
            height: 3px;
            background: linear-gradient(90deg, var(--primary), var(--accent), var(--success), var(--primary));
            transform: translateX(-50%) scaleX(0);
            transform-origin: center;
            transition: transform 0.35s ease, opacity 0.2s ease;
            z-index: 10;
            opacity: 0;
            pointer-events: none;
            will-change: transform, opacity;
        }

        .stat-card .side-border {
            position: absolute;
            bottom: -2px;
            width: 3px;
            height: calc(100% + 6px);
            background: linear-gradient(180deg, var(--accent), var(--primary));
            transform: scaleY(0);
            transform-origin: bottom;
            transition: transform 0.35s ease 0.25s, opacity 0.2s ease 0.25s;
            opacity: 0;
            z-index: 10;
            pointer-events: none;
            will-change: transform, opacity;
        }
        .stat-card .side-border.left { left: 0; border-top-left-radius: inherit; }
        .stat-card .side-border.right { right: 0; border-top-right-radius: inherit; }

        .stat-card:hover .border-animation {
            transform: translateX(-50%) scaleX(1);
            opacity: 1;
        }

        .stat-card:hover .side-border {
            transform: scaleY(1);
            opacity: 1;
        }
        
        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.25), 0 8px 10px -6px rgba(6, 182, 212, 0.2);
        }

    .stat-card:hover::after { opacity: 1; }
        
        .stat-card h3 { 
            color: var(--text-primary); 
            font-size: 2.25rem; 
            font-weight: 700;
            margin-bottom: 6px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            position: relative;
            z-index: 1;
        }
        
        .stat-card p { 
            color: var(--text-secondary);
            font-size: 0.95rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            position: relative;
            z-index: 1;
        }
        
        .loading {
            display: inline-flex;
            width: 100%;
            gap: 8px;
        }
        
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border);
            border-top: 2px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    </style>
</head>
<body data-build="center-out-borders v1.0">
    <div class="container">
        <div class="header fade-in">
            <div class="build-tag">build v1.0</div>
            <h1>Alumni Atlas DBMS</h1>
            <p class="subtitle">Database Management System with SQL Interface</p>
            <div class="border-animation"></div>
            <div class="side-border left"></div>
            <div class="side-border right"></div>
        </div>
        
    <div class="stats fade-in" id="stats">
            <div class="stat-card" onclick="loadStats()">
                <div class="icon">👥</div>
                <h3 id="totalAlumni">-</h3>
                <p>Alumni</p>
                <div class="border-animation"></div>
                <div class="side-border left"></div>
                <div class="side-border right"></div>
            </div>
            <div class="stat-card" onclick="loadStats()">
                <div class="icon">🎓</div>
                <h3 id="totalPrograms">-</h3>
                <p>Programs</p>
                <div class="border-animation"></div>
                <div class="side-border left"></div>
                <div class="side-border right"></div>
            </div>
            <div class="stat-card" onclick="loadStats()">
                <div class="icon">🏢</div>
                <h3 id="totalCompanies">-</h3>
                <p>Companies</p>
                <div class="border-animation"></div>
                <div class="side-border left"></div>
                <div class="side-border right"></div>
            </div>
            <div class="stat-card" onclick="loadStats()">
                <div class="icon">🌍</div>
                <h3 id="totalCountries">-</h3>
                <p>Countries</p>
                <div class="border-animation"></div>
                <div class="side-border left"></div>
                <div class="side-border right"></div>
            </div>
        </div>

        <!-- Admin: Pending Join Requests -->
        <div class="main-content fade-in" style="grid-template-columns: 1fr;">
            <div class="panel">
                <div class="panel-header">
                    <h2>Pending Join Requests</h2>
                    <div>
                        <button class="btn secondary small" onclick="loadPending()">Refresh</button>
                    </div>
                </div>
                <div class="panel-content">
                    <div id="pendingStatus" class="status info" style="display:none;"></div>
                    <table class="table-data" id="pendingTable">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Program</th>
                                <th>Year</th>
                                <th>Job</th>
                                <th>Company</th>
                                <th>Location</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="pendingBody">
                            <tr><td colspan="8" style="text-align:center; color: var(--text-muted);">No pending requests</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="main-content fade-in">
            <div class="panel sql-panel">
                <div class="panel-header">
                    <h2>SQL Query Console</h2>
                </div>
                <div class="panel-content">
                    <textarea id="sqlQuery" placeholder="Enter your SQL query here...

Example queries:
• SELECT * FROM alumni WHERE program = 'Computer Science';
• SELECT company, COUNT(*) FROM alumni GROUP BY company;
• INSERT INTO alumni (name, email, program) VALUES ('John Doe', 'john@example.com', 'Engineering');"></textarea>
                    
                    <div class="button-group">
                        <button class="btn success" onclick="executeQuery()">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Execute Query
                        </button>
                        <button class="btn danger" onclick="clearQuery()">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                <path d="M10 11v6"></path>
                                <path d="M14 11v6"></path>
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                            </svg>
                            Clear Console
                        </button>
                        <button class="btn secondary" onclick="viewAllAlumni()">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <circle cx="4" cy="6" r="1.5"></circle>
                                <circle cx="4" cy="12" r="1.5"></circle>
                                <circle cx="4" cy="18" r="1.5"></circle>
                            </svg>
                            View All Alumni
                        </button>
                        <button class="btn secondary" onclick="describeAlumni()">
                            <svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <ellipse cx="12" cy="5" rx="8" ry="3"></ellipse>
                                <path d="M4 5v8c0 1.66 3.58 3 8 3s8-1.34 8-3V5"></path>
                                <path d="M4 9c0 1.66 3.58 3 8 3s8-1.34 8-3"></path>
                            </svg>
                            Describe Schema
                        </button>
                    </div>
                    
                    <div class="quick-queries">
                        <h3>Quick Queries</h3>
                        <div class="quick-queries-grid">
                            <button class="quick-query" onclick="showAttributes()">
                                Show Attributes
                            </button>
                            <button class="quick-query" onclick="setQueryAndExecute('SELECT program, COUNT(*) as count FROM alumni GROUP BY program ORDER BY count DESC;')">
                                Alumni by Program
                            </button>
                            <button class="quick-query" onclick="setQueryAndExecute('SELECT company, COUNT(*) as count FROM alumni GROUP BY company ORDER BY count DESC LIMIT 10;')">
                                Top Companies
                            </button>
                            <button class="quick-query" onclick="setQueryAndExecute('SELECT location, COUNT(*) as count FROM alumni GROUP BY location ORDER BY count DESC;')">
                                Alumni by Location
                            </button>
                            <button class="quick-query" onclick="setQueryAndExecute('SELECT * FROM alumni WHERE graduation_year > 2020 ORDER BY graduation_year DESC;')">
                                Recent Graduates
                            </button>
                            <button class="quick-query" onclick="setQueryAndExecute('SELECT name, job_title, company, graduation_year FROM alumni WHERE company LIKE \\'%Google%\\' OR company LIKE \\'%Microsoft%\\' OR company LIKE \\'%Apple%\\';')">
                                Tech Giants Alumni
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="panel results-panel">
                <div class="panel-header">
                    <h2>Query Results</h2>
                    <button id="enlargeBtn" class="btn secondary small" onclick="toggleResultsEnlarge()">⤢ Enlarge</button>
                </div>
                <div class="panel-content">
                    <div id="results"><div class="results-placeholder">Welcome to Alumni Atlas DBMS!

Ready to execute SQL queries. Try some of the quick queries to get started, or write your own custom SQL commands.

Tips:
• Use Ctrl+Enter to execute queries quickly
• Check out the sample queries for inspiration
• All standard SQL operations are supported</div></div>
                </div>
            </div>
        </div>

        
    </div>

    <script>
        // Load statistics on page load
        window.onload = function() {
            loadStats();
            addFadeInAnimation();
            loadPending();
        };
        
        function addFadeInAnimation() {
            const elements = document.querySelectorAll('.fade-in');
            elements.forEach((el, index) => {
                el.style.animationDelay = `${index * 0.1}s`;
            });
        }
        
        async function loadStats() {
            const statElements = ['totalAlumni', 'totalPrograms', 'totalCompanies', 'totalCountries'];
            
            // Show loading state
            statElements.forEach(id => {
                document.getElementById(id).innerHTML = '<div class="spinner"></div>';
            });
            
            try {
                // Total alumni
                const alumniResponse = await fetch('/sql?query=' + encodeURIComponent('SELECT COUNT(*) as count FROM alumni'));
                const alumniData = await alumniResponse.json();
                animateCounter('totalAlumni', alumniData.data[0][0]);
                
                // Total programs
                const programsResponse = await fetch('/sql?query=' + encodeURIComponent('SELECT COUNT(DISTINCT program) as count FROM alumni'));
                const programsData = await programsResponse.json();
                animateCounter('totalPrograms', programsData.data[0][0]);
                
                // Total companies
                const companiesResponse = await fetch('/sql?query=' + encodeURIComponent('SELECT COUNT(DISTINCT company) as count FROM alumni'));
                const companiesData = await companiesResponse.json();
                animateCounter('totalCompanies', companiesData.data[0][0]);
                
                // Total countries (approximate from location)
                const countriesResponse = await fetch('/sql?query=' + encodeURIComponent('SELECT COUNT(DISTINCT SUBSTR(location, -2)) as count FROM alumni'));
                const countriesData = await countriesResponse.json();
                animateCounter('totalCountries', countriesData.data[0][0]);
                
                // No success toast for stats refresh
                
            } catch (error) {
                console.error('Error loading stats:', error);
                statElements.forEach(id => {
                    document.getElementById(id).textContent = '0';
                });
                showNotification('Failed to refresh statistics', 'error');
            }
        }
        
        function animateCounter(elementId, targetValue) {
            const element = document.getElementById(elementId);
            const startValue = 0;
            const duration = 1000;
            const startTime = performance.now();
            
            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutCubic(progress));
                element.textContent = currentValue;
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }
            
            requestAnimationFrame(update);
        }
        
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        
        function setQuery(query) {
            document.getElementById('sqlQuery').value = query;
        }
        
        function setQueryAndExecute(query) {
            setQuery(query);
            executeQuery();
        }
        
        function clearQuery() {
            document.getElementById('sqlQuery').value = '';
        }
        
        function showAttributes() {
            // Show column names (attributes) for the alumni table
            setQuery("SELECT name FROM pragma_table_info('alumni');");
            executeQuery();
        }

        function viewAllAlumni() {
            setQuery('SELECT * FROM alumni;');
            executeQuery();
        }
        
        function describeAlumni() {
            setQuery("PRAGMA table_info(alumni);");
            executeQuery();
        }
        
        async function executeQuery() {
            const query = document.getElementById('sqlQuery').value.trim();
            if (!query) {
                showNotification('Please enter a SQL query', 'error');
                return;
            }
            
            const resultsDiv = document.getElementById('results');
            const executeBtn = document.querySelector('.btn.success');
            
            // Show loading state
            executeBtn.innerHTML = '<div class="spinner"></div> Executing...';
            executeBtn.disabled = true;
            resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div> Executing query...</div>';
            
            try {
                const response = await fetch('/sql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: query })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    displayResults(result);
                } else {
                    resultsDiv.innerHTML = `<div class="status error">❌ Error: ${result.error}</div>`;
                }
            } catch (error) {
                resultsDiv.innerHTML = `<div class="status error">❌ Network Error: ${error.message}</div>`;
            } finally {
                // Reset button state
                executeBtn.innerHTML = '<span>▶</span> Execute Query';
                executeBtn.disabled = false;
            }
        }

        
        
        function displayResults(result) {
            const resultsDiv = document.getElementById('results');
            
            if (result.type === 'select' && result.data && result.data.length > 0) {
                let html = `<div class="status success">✅ Query executed successfully</div>`;
                html += `<div class="status info">📊 Returned ${result.data.length} rows in ${Date.now() % 1000}ms</div>`;
                
                // Create table
                html += '<table class="table-data">';
                html += '<thead><tr>';
                result.columns.forEach(col => {
                    html += `<th>${col}</th>`;
                });
                html += '</tr></thead><tbody>';
                
                result.data.forEach(row => {
                    html += '<tr>';
                    row.forEach(cell => {
                        html += `<td>${cell !== null ? cell : '<em>NULL</em>'}</td>`;
                    });
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
                resultsDiv.innerHTML = html;
            } else if (result.type === 'modification') {
                resultsDiv.innerHTML = `
                    <div class="status success">✅ Query executed successfully</div>
                    <div class="status info">📊 Affected rows: ${result.affected_rows}</div>
                `;
                // Reload stats if data was modified
                loadStats();
                showNotification('Database updated successfully!', 'success');
            } else if (result.type === 'select' && result.data.length === 0) {
                resultsDiv.innerHTML = `<div class="status info">📭 No results found</div>`;
            } else {
                resultsDiv.innerHTML = `<div class="status success">✅ Query executed successfully</div>`;
            }
        }
        
        function showNotification(message, type) {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `status ${type}`;
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.zIndex = '1000';
            notification.style.minWidth = '300px';
            notification.style.animation = 'slideIn 0.3s ease';
            notification.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
            
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }
        
        // Allow Ctrl+Enter to execute query
        document.getElementById('sqlQuery').addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                executeQuery();
            }
        });
        function toggleResultsEnlarge() {
            const panel = document.querySelector('.results-panel');
            const btn = document.getElementById('enlargeBtn');
            const enlarged = panel.classList.toggle('enlarged');
            btn.textContent = enlarged ? '⤡ Reduce' : '⤢ Enlarge';
        }

        async function loadPending() {
            const tbody = document.getElementById('pendingBody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">Loading...</td></tr>';
            try {
                const res = await fetch('/pending');
                const data = await res.json();
                const list = data.pending || [];
                if (list.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">No pending requests</td></tr>';
                    return;
                }
                tbody.innerHTML = '';
                list.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${p.name}</td>
                        <td>${p.email}</td>
                        <td>${p.program}</td>
                        <td>${p.graduationYear}</td>
                        <td>${p.jobTitle}</td>
                        <td>${p.company}</td>
                        <td>${p.location}</td>
                        <td>
                            <button class="btn success small" onclick="acceptPending('${p.id}')">Accept</button>
                            <button class="btn danger small" onclick="rejectPending('${p.id}')">Reject</button>
                        </td>`;
                    tbody.appendChild(tr);
                });
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--error);">Failed to load pending</td></tr>';
            }
        }

        async function acceptPending(id) {
            try {
                const res = await fetch(`/pending/${id}/accept`, { method: 'POST' });
                if (!res.ok) throw new Error('Failed');
                showNotification('Request accepted and added to alumni.', 'success');
                loadPending();
                loadStats();
            } catch (e) {
                showNotification('Failed to accept request', 'error');
            }
        }

        async function rejectPending(id) {
            try {
                const res = await fetch(`/pending/${id}/reject`, { method: 'POST' });
                if (!res.ok) throw new Error('Failed');
                showNotification('Request rejected.', 'success');
                loadPending();
            } catch (e) {
                showNotification('Failed to reject request', 'error');
            }
        }
    </script>
</body>
</html>
        """

        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        # Disable caching so UI changes show immediately
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.end_headers()
        self.wfile.write(html_content.encode())

    def execute_sql_post(self):
        """Execute SQL query from POST request"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            query = data.get('query', '').strip()
            if not query:
                self.send_json_response({"success": False, "error": "No query provided"})
                return
            
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            
            cursor.execute(query)
            
            result = {"success": True}
            
            if query.upper().startswith('SELECT') or query.upper().startswith('PRAGMA'):
                rows = cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                result.update({
                    "type": "select",
                    "data": rows,
                    "columns": columns,
                    "row_count": len(rows)
                })
            else:
                conn.commit()
                result.update({
                    "type": "modification",
                    "affected_rows": cursor.rowcount
                })
            
            conn.close()
            self.send_json_response(result)
            
        except sqlite3.Error as e:
            self.send_json_response({"success": False, "error": str(e)})
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)})

    def execute_sql_get(self):
        """Execute SQL query from GET request"""
        try:
            parsed_url = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            
            query = query_params.get('query', [''])[0].strip()
            if not query:
                self.send_json_response({"success": False, "error": "No query provided"})
                return
            
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            
            cursor.execute(query)
            
            result = {"success": True}
            
            if query.upper().startswith('SELECT'):
                rows = cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                result.update({
                    "type": "select",
                    "data": rows,
                    "columns": columns
                })
            
            conn.close()
            self.send_json_response(result)
            
        except sqlite3.Error as e:
            self.send_json_response({"success": False, "error": str(e)})
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)})

    def get_tables(self):
        """Get list of all tables"""
        try:
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            conn.close()
            self.send_json_response({"tables": tables})
            
        except Exception as e:
            self.send_error_response(500, str(e))

    def get_alumni(self):
        """Get all alumni data"""
        try:
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, name, email, program, graduation_year, job_title, 
                       company, location, linkedin, twitter, latitude, longitude
                FROM alumni
                ORDER BY created_at DESC
            ''')
            
            rows = cursor.fetchall()
            conn.close()
            
            alumni = []
            for row in rows:
                alumni.append({
                    "id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "program": row[3],
                    "graduationYear": row[4],
                    "jobTitle": row[5],
                    "company": row[6],
                    "location": row[7],
                    "linkedin": row[8],
                    "twitter": row[9],
                    "latitude": row[10],
                    "longitude": row[11]
                })
            
            self.send_json_response(alumni)
            
        except Exception as e:
            self.send_error_response(500, str(e))

    def create_alumni(self):
        """Create new alumni record"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            alumni_data = json.loads(post_data.decode())
            
            # Generate unique ID
            alumni_id = str(uuid.uuid4())
            
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO alumni (id, name, email, program, graduation_year, job_title, 
                                   company, location, linkedin, twitter, latitude, longitude)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alumni_id,
                alumni_data['name'],
                alumni_data['email'],
                alumni_data['program'],
                alumni_data['graduationYear'],
                alumni_data['jobTitle'],
                alumni_data['company'],
                alumni_data['location'],
                alumni_data.get('linkedin'),
                alumni_data.get('twitter'),
                alumni_data.get('latitude', 0.0),
                alumni_data.get('longitude', 0.0)
            ))
            
            conn.commit()
            conn.close()
            
            response_data = {
                "id": alumni_id,
                "name": alumni_data['name'],
                "email": alumni_data['email'],
                "program": alumni_data['program'],
                "graduationYear": alumni_data['graduationYear'],
                "jobTitle": alumni_data['jobTitle'],
                "company": alumni_data['company'],
                "location": alumni_data['location'],
                "linkedin": alumni_data.get('linkedin'),
                "twitter": alumni_data.get('twitter'),
                "latitude": alumni_data.get('latitude', 0.0),
                "longitude": alumni_data.get('longitude', 0.0)
            }
            
            self.send_json_response(response_data, 201)
            
        except json.JSONDecodeError:
            self.send_error_response(400, "Invalid JSON")
        except sqlite3.IntegrityError:
            self.send_error_response(400, "Email already exists")
        except Exception as e:
            self.send_error_response(500, str(e))

    def send_json_response(self, data: Dict[str, Any], status: int = 200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, status: int, message: str):
        self.send_json_response({"error": message}, status)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def run_dbms_server(port: int = 8002):
    """Run the DBMS web interface server"""
    print(f"🎓 Alumni Atlas DBMS starting on port {port}...")
    
    try:
        with ReusableTCPServer(("", port), DBMSHandler) as httpd:
            # Bind to all interfaces so platform routers can reach the service
            print(f"✅ Server bound to 0.0.0.0:{port} (platform will route external traffic)")
            print("🌐 Open your browser to access the SQL interface or use your platform's domain")
            print("⚠️  To stop: Press Ctrl+C")
            print("🔄 To see changes: Just refresh your browser!")
            print("-" * 50)
            httpd.serve_forever()
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {port} is already in use!")
            print("💡 Try a different port or stop the existing server:")
            print(f"   python {__file__} {port + 1}")
        else:
            print(f"❌ Error starting server: {e}")
    except KeyboardInterrupt:
        print("\n👋 Server stopped gracefully.")

if __name__ == "__main__":
    import sys

    def get_listen_port(default: int = 8002) -> int:
        # 1) Platform-provided environment variable (Render)
        p = os.environ.get('PORT')
        if p:
            try:
                return int(p)
            except ValueError:
                pass
        # 2) Command-line argument: python backend/dbms_interface.py 8002
        if len(sys.argv) > 1:
            try:
                return int(sys.argv[1])
            except ValueError:
                pass
        # 3) Fallback default for local development
        return default

    port = get_listen_port(8002)
    run_dbms_server(port)
