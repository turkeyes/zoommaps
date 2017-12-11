import json 
import random

with open('studies_12_2017_all.json', 'r') as infile: 
    data = json.load(infile)


posters = data[0]["data"] #array of posters

def make_subjects(): 
    subjects = ['kimberli']
    for subject in subjects: 
        random.shuffle(posters)
        task = [
                {
                    "name": "poster viewing study",
                    "data": posters
                }
        ]
        with open('studies_12_2017_%s.json' % subject, 'w') as outfile: 
            json.dump(task, outfile) 


def make_singletons(): 
    for i, poster in enumerate(posters): 
        singleton = [
                {
                    "name": data[0]["name"],
                    "data": [poster]
                }
        ]
        with open('studies_12_2017_%d.json' % i, 'w') as outfile: 
            json.dump(singleton, outfile)

make_subjects()
