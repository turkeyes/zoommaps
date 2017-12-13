import json 
import random

with open('studies_12_2017_all.json', 'r') as infile: 
    data = json.load(infile)


posters = data[0]["data"] #array of posters

def make_subjects(subjects): 
    placeholder = [
            {
                "src": "/imgs/CVPR_studies_12_2017/slot_7_placeholder.JPG",
                "w": 3000,
                "h": 1500
            }
    ]
    for subject in subjects: 
        random.shuffle(posters)
        taskdata = posters[:6] + placeholder + posters[6:]
        task = [
                {
                    "name": "poster viewing study",
                    "data": taskdata
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

#make_singletons()
make_subjects(["chollette"])
