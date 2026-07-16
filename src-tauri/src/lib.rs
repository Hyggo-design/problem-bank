use std::fs;

// Liệt kê các file .tex là "file nội dung" (loại bỏ file có \documentclass như main.tex).
#[tauri::command]
fn list_content_templates(dir: String) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|s| s.to_str()) == Some("tex") {
            let content = fs::read_to_string(&path).unwrap_or_default();
            if !content.contains("\\documentclass") {
                out.push(path.to_string_lossy().to_string());
            }
        }
    }
    out.sort();
    Ok(out)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

// Tạo thư mục (đệ quy) nếu chưa có — dùng cho thư mục DB trên ổ D.
#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

// Copy file (nhị phân an toàn) — dùng cho sao lưu DB.
#[tauri::command]
fn copy_file(src: String, dst: String) -> Result<(), String> {
    std::fs::copy(&src, &dst).map(|_| ()).map_err(|e| e.to_string())
}

// Mở một thư mục trong Windows Explorer.
#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

// Liệt kê TÊN file (không kèm đường dẫn) trong một thư mục.
// Thư mục chưa tồn tại -> trả danh sách rỗng (không coi là lỗi).
#[tauri::command]
fn list_files(dir: String) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    let rd = match fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(_) => return Ok(out),
    };
    for entry in rd {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                out.push(name.to_string());
            }
        }
    }
    Ok(out)
}

// Xoá một file (dùng để dọn bản sao lưu cũ).
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
struct TxStatement {
    sql: String,
    params: Vec<serde_json::Value>,
}

// Đổi 1 giá trị JSON (từ JS) sang giá trị SQLite tương ứng.
fn json_to_sql(v: &serde_json::Value) -> Result<rusqlite::types::Value, String> {
    use rusqlite::types::Value as V;
    use serde_json::Value as J;
    Ok(match v {
        J::Null => V::Null,
        J::Bool(b) => V::Integer(if *b { 1 } else { 0 }),
        J::Number(n) => {
            if let Some(i) = n.as_i64() {
                V::Integer(i)
            } else if let Some(f) = n.as_f64() {
                V::Real(f)
            } else {
                return Err(format!("Số không hỗ trợ: {n}"));
            }
        }
        J::String(s) => V::Text(s.clone()),
        // Phòng hờ: mảng/đối tượng → chuỗi JSON (thực tế JS đã stringify sẵn options/metadata).
        other => V::Text(other.to_string()),
    })
}

// Chạy CẢ CỤM lệnh trong MỘT transaction trên MỘT kết nối (all-or-nothing).
// Lỗi ở bất kỳ lệnh nào → tx bị drop mà chưa commit → rusqlite tự ROLLBACK.
#[tauri::command]
fn execute_tx(db_path: String, statements: Vec<TxStatement>) -> Result<usize, String> {
    let mut conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.busy_timeout(std::time::Duration::from_millis(5000))
        .map_err(|e| e.to_string())?;
    let tx = conn
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    let mut affected = 0usize;
    for st in &statements {
        let mut vals: Vec<rusqlite::types::Value> = Vec::with_capacity(st.params.len());
        for p in &st.params {
            vals.push(json_to_sql(p)?);
        }
        affected += tx
            .execute(&st.sql, rusqlite::params_from_iter(vals))
            .map_err(|e| format!("{e}\n↳ SQL: {}", st.sql))?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(affected)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_content_templates,
            read_text_file,
            write_text_file,
            ensure_dir,
            copy_file,
            open_path,
            list_files,
            delete_file,
            execute_tx
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tx_commit_het_hoac_khong_gi() {
        let dir = std::env::temp_dir().join(format!("pb_tx_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("t.db").to_string_lossy().to_string();
        {
            let c = rusqlite::Connection::open(&path).unwrap();
            c.execute("CREATE TABLE t (id TEXT PRIMARY KEY, v INTEGER)", [])
                .unwrap();
        }

        // 1) Cụm hợp lệ → COMMIT: có 2 dòng.
        let ok = vec![
            TxStatement {
                sql: "INSERT INTO t (id, v) VALUES ($1, $2)".into(),
                params: vec![serde_json::json!("a"), serde_json::json!(1)],
            },
            TxStatement {
                sql: "INSERT INTO t (id, v) VALUES ($1, $2)".into(),
                params: vec![serde_json::json!("b"), serde_json::json!(2)],
            },
        ];
        assert_eq!(execute_tx(path.clone(), ok).unwrap(), 2);
        let c = rusqlite::Connection::open(&path).unwrap();
        let n: i64 = c
            .query_row("SELECT COUNT(*) FROM t", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 2);

        // 2) Cụm có 1 lệnh HỎNG ở giữa (bảng không tồn tại) → ROLLBACK: vẫn 2 dòng, 'c' KHÔNG lưu.
        let bad = vec![
            TxStatement {
                sql: "INSERT INTO t (id, v) VALUES ($1, $2)".into(),
                params: vec![serde_json::json!("c"), serde_json::json!(3)],
            },
            TxStatement {
                sql: "INSERT INTO khong_co_bang (id) VALUES ($1)".into(),
                params: vec![serde_json::json!("x")],
            },
        ];
        assert!(execute_tx(path.clone(), bad).is_err());
        let n2: i64 = c
            .query_row("SELECT COUNT(*) FROM t", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n2, 2, "ROLLBACK: 'c' phải KHÔNG được lưu");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
