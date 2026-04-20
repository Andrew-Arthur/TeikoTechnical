from teiko_technical.queries import get_sample_cell_type_frequncy
import sqlite3
from pathlib import Path


def compact_frequency_data(data: list[dict]):
    compact = []
    sample_index = {}

    for row in data:
        cell_data_keys = ['population', 'count', 'percentage']
        cell_type_name = row.pop(cell_data_keys[0])
        cell_data = dict([(key, row.pop(key)) for key in cell_data_keys[1:]])


        sample = row['sample']

        if sample not in sample_index:
            sample_index[sample] = len(compact)
            compact.append(row)

        compact[sample_index[sample]][cell_type_name] = cell_data

    return compact