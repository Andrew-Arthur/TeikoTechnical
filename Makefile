setup:
	pip install -r requirements.txt
	pip install -e .
	cd dashboard && npm install

pipeline:
	python load_data.py

dashboard:
	uvicorn teiko_technical.api:app --reload & cd dashboard && npm run dev

test:
	pytest tests/ -v
	cd dashboard && npm run test:run