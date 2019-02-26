import json 
import random

USE_VSS = False;

STUDY_SET_TO_USE  = 'studies_12_2017_all.json'
INDIV_PREFIX = 'studies_12_2017_%s.json'

if (USE_VSS): 
    STUDY_SET_TO_USE  = 'vss.json'
    INDIV_PREFIX = 'studies_12_2017_vss_%s.json'

with open(STUDY_SET_TO_USE, 'r') as infile: 
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
        with open(INDIV_PREFIX % subject, 'w') as outfile: 
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
subjects = ["subject_" + str(i) for i in range(15)]
make_subjects(subjects)
