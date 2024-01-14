import pstats
p = pstats.Stats('log.txt')
p.sort_stats('cumulative').print_stats(10)