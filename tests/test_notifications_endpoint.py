from src import app as app_module


def test_notifications_get_returns_empty_list(temp_audit_dir):
    with app_module.app.test_client() as client:
        response = client.get('/api/notifications')

    assert response.status_code == 200
    assert response.json == {'notifications': []}


def test_notifications_ack_marks_entries_as_read(temp_audit_dir):
    unread = app_module._build_notification('run_complete', 'Audit run complete')
    app_module._append_notification(unread)

    with app_module.app.test_client() as client:
        response = client.post('/api/notifications/ack', json={'ids': [unread['id']]})

    assert response.status_code == 200
    assert response.json['updated'] == 1

    notifications = app_module._load_notifications()
    assert notifications[0]['read'] is True


def test_record_run_notifications_creates_run_and_anomaly_entries(temp_audit_dir):
    run_id = 'RUN-TEST-001'
    payload = {
        'context': {
            'anomalies': [{}, {}, {}],
        }
    }

    app_module._record_run_notifications(run_id, payload)

    notifications = app_module._load_notifications()
    assert len(notifications) == 2
    messages = {entry['message'] for entry in notifications}
    assert f'Audit run {run_id} completed.' in messages
    assert '3 anomalies pending review' in next(msg for msg in messages if 'anomalies pending review' in msg)
