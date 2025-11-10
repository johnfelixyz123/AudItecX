import json

from src import app as app_module


def test_report_generation_requires_run_id(temp_audit_dir):
    with app_module.app.test_client() as client:
        response = client.post('/api/reports/generate', json={'format': 'pdf'})

    assert response.status_code == 400
    payload = response.get_json() or {}
    assert 'error' in payload


def test_report_generation_from_run_results_creates_pdf(temp_audit_dir):
    run_id = 'RUN-UNIT-001'
    app_module.RUN_RESULTS[run_id] = {
        'context': {
            'summary_text': 'Audit completed without blocking anomalies.',
            'anomalies': [{'label': 'Variance', 'rationale': 'Amount variance requires review.'}],
            'documents': [
                {
                    'document': 'invoice_INV-100.pdf',
                    'vendor': 'VEND-100',
                    'amount': 1025.5,
                    'currency': 'USD',
                }
            ],
            'journal_entries': [{'entry_id': 'JE-1'}],
            'totals': {'total_amount': 1025.5, 'documents': 1},
        }
    }

    try:
        with app_module.app.test_client() as client:
            response = client.post('/api/reports/generate', json={'run_id': run_id, 'format': 'pdf'})

        assert response.status_code == 200
        payload = response.get_json() or {}
        assert payload['status'] == 'ok'
        assert payload['format'] == 'pdf'
        report_url = payload['url']
        report_name = report_url.split('/')[-1]

        report_path = app_module._reports_dir() / report_name
        assert report_path.exists()
        assert report_path.suffix == '.pdf'

        with app_module.app.test_client() as client:
            download_response = client.get(report_url)

        assert download_response.status_code == 200
        assert download_response.headers['Content-Type'] == 'application/pdf'
    finally:
        app_module.RUN_RESULTS.pop(run_id, None)


def test_report_generation_from_manifest_creates_docx(temp_audit_dir):
    run_id = 'RUN-UNIT-002'
    manifest = {
        'run_id': run_id,
        'summary': {
            'markdown': '# Summary\nReport generated for testing.',
            'anomalies': ['Invoice variance requires follow-up.'],
            'totals': {'total_amount': 1800.0},
        },
        'documents': [
            {
                'document': 'contract.docx',
                'vendor': 'VEND-200',
                'amount': 1800.0,
                'currency': 'USD',
            }
        ],
        'journal_entries': [{'entry_id': 'JE-2'}],
    }

    manifest_path = app_module.AUDIT_LOG_DIR / f'{run_id}.json'
    manifest_path.write_text(json.dumps(manifest), encoding='utf-8')

    with app_module.app.test_client() as client:
        response = client.post('/api/reports/generate', json={'run_id': run_id, 'format': 'docx'})

    assert response.status_code == 200
    payload = response.get_json() or {}
    assert payload['format'] == 'docx'
    report_url = payload['url']
    report_name = report_url.split('/')[-1]

    report_path = app_module._reports_dir() / report_name
    assert report_path.exists()
    assert report_path.suffix == '.docx'

    with app_module.app.test_client() as client:
        download_response = client.get(report_url)

    assert download_response.status_code == 200
    assert download_response.headers['Content-Type'] in {
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream',
    }