.PHONY: setup pipeline dashboard backend frontend test

setup:
	pip install -r requirements.txt
	pip install -e .
	cd dashboard && npm install

pipeline:
	python load_data.py

backend:
	uvicorn teiko_technical.api:app --reload --host 0.0.0.0

frontend:
	cd dashboard && npm run dev -- --host 0.0.0.0

dashboard:
	make -j2 backend frontend

test:
	pytest tests/ -v
	cd dashboard && npm run test:run