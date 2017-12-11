import json 
import random

with open('studies_12_2017_all.json', 'r') as infile: 
    data = json.load(infile)


posters = data[0]["data"] #array of posters

#subjects = []
#k = 6
#for subject in subjects: 
#    posters_for_subject = random.choice(posters, k)
#    task = [
#            {
#                "name": "poster viewing study",
#                "data": posters
#            }
#    ]
#    with open('studies_12_2017_%s.json' % subject, 'w') as outfile: 
#        json.dump(task, outfile) 
#
#


for i, poster in enumerate(posters): 
    singleton = [
            {
                "name": data[0]["name"],
                "data": [poster]
            }
    ]
    with open('studies_12_2017_%d.json' % i, 'w') as outfile: 
        json.dump(singleton, outfile)