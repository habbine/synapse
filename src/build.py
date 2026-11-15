import datetime, re, sys
h = open('index.html').read()
m = open('health-model.js').read()
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
h = h.replace('__BUILD__', stamp)
open('../index.html','w').write(
    h.replace('<script src="health-model.js"></script>', '<script>\n'+m+'\n</script>', 1))
print('standalone built, stamp:', stamp)
