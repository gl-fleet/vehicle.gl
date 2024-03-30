#!/bin/bash

intervalo=5
info="/sys/class/net/"
cd $info
for interface in ppp0*
do
  rx1=`cat $info$interface/statistics/rx_bytes`
  tx1=`cat $info$interface/statistics/tx_bytes`
  `sleep $((intervalo))s`
  rx2=`cat $info$interface/statistics/rx_bytes`
  tx2=`cat $info$interface/statistics/tx_bytes`
  echo $interface
  echo ----
  echo RX: $((($rx2-$rx1)/($intervalo*1))) Bps
  echo TX: $((($tx2-$tx1)/($intervalo*1))) Bps
done