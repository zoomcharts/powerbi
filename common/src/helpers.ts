/// <reference path="../../common/src/config.ts" />
interface Window {
    PieChart: any
    FacetChart: any
    NetChart: any
    TimeChart: any
    ZoomCharts: any
}
module powerbi.extensibility.visual {
    let chartContainer:HTMLElement = null;
    let messageOverlays:Array<HTMLElement> = [];
    let infoMessageOverlay:HTMLElement = null;
    let infoMessageTitle:string = null;
    let infoMessageBody:string = null;
    let outerSize:Array<number> = [0,0];

    export let isDebugVisual = /plugin=[^&]*_DEBUG&/.test(document.location.toString()) || (document.location.search || "").indexOf("unmin") > -1;

    try {
        Number(window.devicePixelRatio);
    } catch (e) {
        console.warn("Cannot read window.devicePixelRatio. Applying workaround. See https://github.com/Microsoft/PowerBI-visuals-tools/issues/81", e);

        let value = 1;
        if (window.window.devicePixelRatio) {
            value = window.window.devicePixelRatio;
        }
        Object.defineProperty(window, "devicePixelRatio", {
            get: () => value
        });
    }

    export function appendZCCss(target:HTMLElement){
        let style = document.createElement("style");
        let sprite = "url(data:image/png;base64," + "iVBORw0KGgoAAAANSUhEUgAAABkAAAXsCAYAAADTjiJuAAAleElEQVR42uydXWwUVRTH3W5nu7u2M8CWnQ1ll1rLVqAbEKlC2weVxAd9ARsTRZsY44upCiExIIlBvgMRbQNo6gMhoPDgA8/yWKIPJsbPSPpKa2MIpvTTtgD1nHiNk0Pma2+HtPb/S/6ZM/fO7X/uuTOE7ZnuPAQAAGBRcPfu3SSpSHqRdmd5q/aTQcbyGDdx/30GLGnkY2KRWlwMWrg/2EHuBDrJQNPVSbfbge0B1yPUeHmgFcDAfzwAAAAAAADgPgxSmrdRGuRITWprRGXQMkvwNoSRMesB9wsDRTijNKnBxaCB+4Md5In/SQaark66I79wor8FAAAAALD4kJUEjqMysR0mBRX7ik8olAlpq1KRVCK1+4iPsUKli42ULLUt+MjmcVgTrAnWBGuy0NYE9UUAAAAA/L8wREEgEkyHSWbWh3JPyCStU8qR8qQmH/Ex6bDVA1MprbYZH5k8DmuCNcGaYE0W2pqgUgoAAAAAlGVDlzYKjoGlSEob0iTETCwUzlA4Q+EM/0DiEsYlDAAAAACUZeeitJFxDMxHUtqQJiFmkkbhDIUzFM7wDyQuYVzCAAAAAJgPJY6qWCx2i8WxV5+OSdZRtsh69ZVdnBHlWYr/Q/bJsUGLMzYPTiQSEyxpIvvkWC8TeXZZ0tMsmRLZJ8eGMakiLWfJxZV9Oiax5ubmNYZh/FhRUXErm8128g+srq7+hPdZmUzmXWqL65hUHD16tHHz5s2Htm/f/kE8Hh/hM7948eLjW7Zs6bUsq5/260kJLRPSEtJjHR0d++msv6O47vz58+vT6fRQfX19Hx+nNRPVVkmqpRT91tnZ+bZaZJtnQun7PpfLfcrH6JoYS5cu/aJYLJ5T5cC0qtitb21t/byuru4rimt00hW3bftQZWXlKCuZTP5CbdWmaXbz+qRSqd9PnDjxArWZOibJS5cubTx48OBbx44de+f48ePPq0u2fs+ePa/T9ik+TvcSNkgZUoNK1QqeCWkZaRUpR0qSYqFNNDQPTERheYeGeLwdpLBccBMKzQAAAAAIinHv3r1bLI79+/RLHKZXn05xJuOso4hjRZ8YG+LMM7dv3x5jSRPZF2Zm8uxM0hqWHCj75NjAJqJYI1Ig+jRMYoODg0VKyQ90FQ2PjIzsoLbKycnJk7zPGhsb66K2Ch2TijNnzuSvXbv2/tWrV3fS/3H5cq3ZvXt3kdpOTkxM/Er7y9lYayaqprWir69v1+jo6DcUL9u7d2/j1NTUwI0bN77m43RnwsRJNfRDf75y5UqnWgOrv7//I0rft8PDwz18jLbJ+Pj4uaGhoc9UOTBBSpEKnLKbN29+SXFSa03oTPfzWty5c2dkenr6J/6BZPoxt9H+9Z6ennY21bqEeZF7e3tfOn369MunTp1qU+mqvXDhwjbaPsrH6S58nFRNyqpULVWpeZiNSJa6R2LhTDSYFyaysNyqIR5vBiksZ9yEQjMAAACAsizKsgu3LGupuFFt1f797TomtopLPltbx6Sg4nafbQEmMAl/CZNKAWSjLIuyLAAAAABQlkVZdp6WZVMqttU2LbaqXa9wZqo477XVmglLxU0+2wxMYBL+EiblA8hEWRZlWQAAAACg9ova7zys/RYdcaMjtlzai+WYtDjiUoC4pSwT0lalkl9crklJDPKLS0gX0oXaL2q/AAAAAEDtF7Xf+VD7zTli2xGnXdpz5Zg0OOJ8gLihLBPSOqW8X1yuSd45KECcR7qQLtR+UfsFAAAAwKLnwb/ikuMIkFWi1VQin2bxrKIy2eRSPEvOpUm7i6Fd7pMFUyxOkdPEJS7oPlmwKbCJfor0TeQDFqs1TLRSpG8iUwQTX5OqqqpRFsVthmFMsuQPpq8sn2GJOLDJcsejIutIzyg1i+r1s0rNjjgbxEN+e7vpiC3xet4syxmjHAsAAAAAvOJSB/2CsiRMNXWKpTGr4PUu0W7MpUnRxdAsd7H/YokCcpNLnNFd7IaoTGSK9E3kAxYyRRomnil6JCITmaLoTZoWtAk/KjLM4nTRt1aPs0Tq+O1HMywRBzKRj4rUkdYqrXSpXjvbzTCv4a1RSvFAll+MciwAAAAAAHiwxOhVPRtZHLv9pkLnY3ZsYGDgyX8/3nEsjBhTmJihDegjwcisgj5CXKf2hNdToLxftgE/2k4vwNlGfWkNE3eDmZmZ8SNHjrxGfXV6M5EGIQhrkuC888FRmqQ575z/SGfCeef88zrMKuge+WPfvn1vUl+b7mO8TIyUJK08fPhwp9OI0jh6+fLl56ivVvsxXmmkUifuEw28jOR9MudG9DLnV1jO+yQKo1oliqmNiMIo/o8oBgAAAAAAYPH8ZUDMsqwnWBx7/eUAi/dDG2zYsKGNnqAdYXEsjWjfFiZ2aIN4PD7Kg1mJRGKQ2lNe38rE+2Ub0PPDkwcOHHiD+pZomHgb0Auf36O+tdozkQZBFdYkxXnng6M0WcJ55/REOhPOO+ffaUT3yJ9nz579kPpeLetrteSakGpIzdLIMIzxrq6uDuqr1/haLQ8jeZ9o4Gkk75M5N6IXbO/q7u7e6bxPojBaxVJxjPuiMKpUwm8kAAAA/M3e9UDHdKXxkUgy+TeTTNokpKaSSBLaQgkREZWkXSUK2oqqVasabBXVZRVL7aK6VFsUAFGttSgFghYtWiqAVoVERBEAQqHq7u87+cZ55+3MMXcms1vt/Z3zO3fee/fe37vfve/Nu+97914FBQUFBQWF3xziwBKwhmxCM3ieaXLg4f4E/BDMAwW4FpzC++3CW5dZU1AwU3Uf+Hvx78mgsMPJjgRWgGfBl8DeYKEm0RGwFx87x3EfAdfw8V3ga+BuUPD+mnqRQPA0KJwhxy3RbPcECb01+4oNdvCChEgnsKamJPkssMthSRg9JURyOM2HztZJKFfsYW1Etns0GAOu0h07zA3jUxZax/vzuHV9rBc55+BsqmniPOwgzhnNdXJUe504KxIFMiDoSMQBZMxVlcQcmCuV00pAtuJdRGcJkRdAaZjlL0b5j5f8wM8lbyteoNtIc3CD9K/I74pMbJZSMNigoKCgoKCgoKCgoKDwf8Dw4cONTzzxxJ8bN268pUGDBmX169e/3ahRowNNmzad0L59+2i3PmWgxJ07d45F5tuQ+c9PP/3053369Hmvb9++45577rlFDRs2vJKUlHQB+9sjrmvduTlz5pibNGmSD5HTU6dO7cdTNjYCG4JNt23b1qlFixZfQ+inrl27NpIuERJ4t2nTZgBMc4cF6oCRoAkMBh8AEwoLC7NgthKYc+O6deuCZEWCmjVrtqt169abSYAz9tKaEjSCsQMGDHgHpisbOHBgCu2XEQmHGa717t17HH5HQfBNnPHbWqampo7B5z6PLlq06BnEvdWzZ8/uiOsjIxKFyv4lJyfn7/hdFZnuSElJOYo6KrYRdVWEUqQvW7asGeLewZdSfal0MiIPpaWlFbVt23YB/QZrc8Wna5hEx/r169cd5ro6duzYjrIikdnZ2Z8g8eXc3Nxa2LZwxVexkSs/LCMj4wuYs3Dfvn1Ud74yIuY1a9a0Sk5OvoyWs37YsGFh9lpgVlbWELRA8frrr48ms0pdL3RGYMyYMWP+StcB7F+QmZnZq2XLlo/i2ojH77ao+DUkQExPTz/QvHnz2UOGDDG59E3X/PnzeyLjbTDdRVTwLbp2IHwZdXZ4xIgRE5966qlCmxgayCrchkJkhLz44ksAmy5ZsuRPo0ePHoqM38LHfa9evnw5E/szcOtZSwI2QnwVxtmZZUtk5ElZY8HHuKUlcOVXLSgoeLJDhw47dULLyeSufkBmZPpySX3Ah06dOtXy2WefzbeJ0IWM/aGGigILVispKcl6/vnnv0UjuTZo0KB/SqwsLScEpoFP2+53dMwTQqFgOBgEehsUFBQUFBQUFP6noIc5IJdCjwlgkMu/eJRMqEcFWCTKcwLMVq1adca+zMTExDCPCOiJUTUHQkNDc+iJ0SMCWhqNxq3o90fIipisVutKmWFTJpMpT7ZzagIbYeTZFhkh9B+bU3/GaXNxj7Z5vXr1tmozwkwl49FpHdujR4+50dHRh7XHYmJiJiGNnwFwS4hfHNQBk8Gs7t27z7Ydq1279kxd30ReiEVqgEbuIUeBTfBaJI+Owbyzsc0dUxeF4uLi1lHG2pcGYCRefwwgEYi9bxNxRygBDNUdC3jxxRd7kMjgwYNfpJ6WWxcn6E+hbr/xySeffC08PHwvfidKNGMp8cCIiIhPu3Xr1pNM55FxXJgQ6WFuujGgv6dGopm4lYWAXh77r+EmXdmgoKCgoKCgoGDD6tWr/crKynphusavMJ1pGU2iiEkO9//000/jjx49Wt3dr2wrUSbIfAsy//ns2bOrd+7c+dY333wz7NixY3PxZHIJPH/u3Lk2Ln8vjIkQgm7evLkDPDVjxowX+Sv/WGZCly5d0iGwCSdw7fDhw4+7UiKv0tLSPjDNHRawgmbQHzSCwWAVPMEnXb9+vQjTaq7r378/jsnBCJtvP3369FoS0E/NyL99wIgtW7a8SVNqfvXVV/VlS0OPnVfz8/OH43coBAfhjEfhjEfbSNurVq2KhycuDSa7uXfv3k48rMRpWJDwlz179gwiEWS4DXVz5MaNG4U20jYc/ylwCdaFWX9Bo3iZSiclgrMvOHny5Ez6DVbjiq+lYQwdg1AnmKts8eLFLWVFzEVFRTOR+NKECRMosyAwRMdg2g+nZh5O6Ae8CqF4Ug/cAW+88UZjWjHk6tWra1auXBlqrwWiYQwUwNatW8msobIVXxkMxySsr6ABXMMF+cOlS5deOX/+fK0zZ87EXbx48RnUy0rBwB1hFzh948aNQS5NYzp+/PgOuOg2wnQX0Bhu0bVDVztMdBDu9OEXLlz4XjCw7zPchkyyQv5gFTAB30O0xqcKvZFJv0mTJmWjj/gYjWrC1f5vwWCh5UCwrJAPaAIjuJVZWTgEDMVHAXUxF/EmndASMrmrc6b6MCtr9lnwcq0+fL+bBYMuZB6KVTFgwTC8EmlQXFy8EY3kyqZNm97k0gMVK2QBE8E6mvtdhaMym8jEAl4GBQUFBQUFBYX/NbzxTDyPQo8J4PFzAS8MEehRARaxeE6AsX379nboHGXgQdviEQE90Bvbd+XKFXKaeXlEQAt694Ie8AOyIv7oYS0WEkBXfJVsv8QfjEUveI2M0O7du5vIdFC9uUdbSy+EiSf7T5w4se+KFSvGoge8V2iAL27H20rjlhC/OLCCNcB66IK/LRjoCH1g65u4JcT9Rx/OzALGHzx4cJEAEGeiblC+vBBehSzTXYxeoHnhwoXdBACxUVyfgOtCVezcVnzz8vKyBTBv3rwsm7ncEfLlUAufXbt2dcd7lh08FYRHnJp+eBWyCO+/XiDTeWTpklmzZlXlphsut8KL/OsRCxjA2x4Av61Q3WoFBQXXMZzoaQHBHO5RAa2QRwU8VyK9AEOJOCeioGbsUzP2qRn71Ix9asY+NWOfmrFPQUFBQUFBQUHhdw4akIdZlcZh5qWrFNK2J0TMELilmYvI7AmRCHxfvxDzSN2g0BNzERmpBAhTwZZgA1eH4nph2HMXTJ73A5mFQtrG/gAWqAlawXASACtLC+Dj766UmZ6Y6erPOJ7IAka3RsBimMEReyKYuK2QxwAb3WppPA3dz/ZEaD+Vgk1m5jBCqqWxSBQ+nS6xJ0L7ebVJq4bx0i2NImHCtjH2RIYOHfo2Z2zWMAJsINXSqE7AuqNGjfoA08yVwgS3KaRtGpxPYvo6Ac1SLY1nGgslIbAV+ByFvB0NJmqEXAcLBbIpoijk7QA2V03MDjfRY/cuKgEJ3f/3LhYxS7YoeehblBrwraCgoKDwu4cXvsR9B0MQr1LoqS/VAniMo6DBlbTtCRHToUOHaCzqdYxrnOGJQXk+AkAYz4Pyol0tiRe+0qT1+2mI500KaRv7fVkgCgwDTSzgJS2AkeSdhR3ANC+T35EFfECX4YdRyofsiWCkbAE7L33cbWkmW8vRg/ZTKdhkARyaXGlpFgzsLrQnQvtt9aFhpCstzYRvgP9iTwSTrQ/ijAM0NIExsi3ND7RiDO8wtKgSmlKAQtrG/lgB6OuEMpZqaRwpkP3vdcGGFPL2g2BVjZDrYCE/PjsLhbzty+aKwsfI73ry3uVDQvf/vYsRINmi5KFvUerLZwUFBQWF37zPygvLkfyBXsk6Q4pLaaTdG5SYZ3pNvQeTOW6grEgkJ6wDWu/BOhw3UlbEygmtMnHvGxG9d87oERGbANEmBEbCqdPD7TrRC+iEwmyuj4oQMYOpjoQ4NLpdEjAebO/ooqQSuSzilBDHl7oYMdNYL3sZ0YpHOP4ICbkrEgjG628rvF0DrOK4JPKOs0jdLeQh0MIrUSVRacAXmBlgREU7zyK0J8DbRoOCgoKCgoLCrxmVMLFLpnASFNeVkTV+AuDRYwn3YA2O6ycrEsIJrWDYPWjluCGSGuwjQSgT934TYe8cQg+JQIChEQrZsGFDR7frRC+gEwrSuD7cFgkAExwJ2UrmdknASDBJOACVyGUR54TkKz8Esyi94MChuZLdgEnuiviBkfrbCm9HgCEVUZJKLBSiu4VY2HMXzJ6gJDCF+QhoqmjnmUl3AtjGfgUFBQUFhfsa+iXdX3311Wx6M+oqsYxiC8rLkUgwWFcz3keWyWCCQ68Qr7wWBbbmSK3AJnpyZs3ANLA52Eb3Xrgrh1XsiXiDsWA2R4oH/ezQqOGDYCPtm25N+mhHInFgJ45UA6x8D1rAhhy/I4edHIsgkU4kxpmRGxw3yfa6XZveaRHOzEz77AyoiNcM3bGAj8mK1ObQymEE6K9Z1z+QMzdq00uKcKthQbAKaGEGa5dIdEekt65pmjjzIHzXZRRCeFeESBewA9gQtPBxb2YllxoOJ64Otp8/f/54d24rU6ZMGUoXtqP7loXtnwo2pVCCtvi1OR8vR7cVH9DMlWyVJaczcz6VDAoKCgoKCgpOwAsPAgEFBQUdhBvAtP8tEHg5EjG2bdvWNswgwQXWAKuwVqCjF5uW3r17pwhg7dq1zWfOnFnPHnNzcxvMnTu3PibIT6Kl+oQG06dPf4ZHd1SxayowAisUZvKImVhs+9yDwWCs9v2wLT2GKFR3JBJpi4TFHmNo3z0YCMaweZPlRDiSM+MdWCCG6yPeVREfzbAcLQIovmbASxBYTUpk/fr1NTnjMDaDBUtf+OOnEfR96aWXjJy5jza9lMiQIUPSBKNPnz6xS5cuDUc9hRIxvCqYhAwMl0WwVHsbocGiRYuCME4okIjFBbl/4qYI3kr8gZomN9EgPs5kz6iLIg++/PLLTbEG5gjhBk6cOPEXmLSqfRFuIWCCG6ymKbnDhQX9NT4TWYZQes5H9U8UFBQUFBR+hf6T1OWnpJn86UmRsPBH4bT/pOXq06LJslM6lmfW7LNTIo0zpjBjZal4alWpoHR//OKscNp/Eo8z8pt57L9oZJrnlIiI3OOC4sZ+Un72DZacFB03nBFO+09qIGHlGcUOWXX+cTIPZXhXqPa/T4hsiDjtP4n5+EdhmFbskNYFx0W7vNPlIsw4lJ5EnH5Xn/ivEzZz3KVWhI6lrygVJJS09KSwzC2RF6GiU2Lt2frPKq8P3xnHRCB+Q4hKRCFtuy5Cv7twi6GzJQbPLhfSlgz1JC9CzZXCRqhcaqZUR5R5EEil8Z5e7L5Ic9j74QU/ilA+ezIHZUysxBk7ElH+E+U/UVBQUFBQ+K34T0Z+Ic+/bxKGd3YIp/0ndeZ9L6zT99tl9Iz9ojr/pjB66h5hnZwvCHWmfSuc9p9Yc48Kw4dHHHPSD8Lw/gFBMPxzZ3k46kthffdL4fQbbut8PBlOLXLMCXsFmccGw7h8YXj7a0mRj0oc9E2Y7+4WhsHLBYNL9K2kyLwiNgfA0IrQMcPwdYKEyEyGD75zQWR2ASXWni2e5ovv9k+8pxwhISpReTi5wHURgnnEqvJwdrEgBs3S90+4/qRF0DQJhn9sFsYxXwrjxP3COL1IEH2nH+X+ibsiU2CG8btg6++JZA5N6zqKjB2LKP+J8p8oKCgoKCgoJ82vy0nDD22OSY+p9FL60XbdBcUP7zfddsw5J829RCqBD8wrEcmTN4lGz3YTFN807muNiBNOmsaNG4tweBLqpaQJmyA9zWtdHY+nZYjUkbniiYl5Ihrv8X00D+BOOWmwaosgv1XDls8KShDfdbB4bODU/6rguu27idhZB0V1iGh8LM45BLDokGiKimyxulTUgYvj0UUnRFv2o2j56PO9xEPTDpCzRlKEzRX10XGR+I9PRdzQj8RjH2wWmcOmiJylu+5mlgRz1fjrHFF99GoSIZI5nRfB8i8ijpsi0TrzoHh8zj7Reu1pQa4LCqm51npvo6jTtqugOA+9v53qzXmRzMxMQY6ZlCHTRPyQ+cI0u0SQyy8SZ1oNJYwCyUVIPhZb64rsP4MEnBdJS0sTNeE4SwQpcy92zOibcAq8RZlwZMaxT5KPO+ekWbBgwbtYu0mAtKiN3VtHcnKyoAaCFXYEToriKSeNgoKCgoKCgsLv2qfluKfFhGuDfCbrjpUJQs6XZ23HnPNp3VOEHALvfycazsoXXxSdF4T4j49pRJzwOty6dUuQ4+XijdvCJkjOMq1nqPTaLfGn5d+J9Lnfwp+1CyUrlBO5cuWKMLz1udhbekUQpu2/IF7bgMQ6fF58WYRN3itIhOG8SFlZWXlFDlsjDGO2CfK6Gd78TOixvPCyCJ/2nSDfFkPSXHDxZS09IjqvPiYazN0n3lh9QNQatUzYcPrqTdF93XHRfHEhiRDJnM6LXL9+XZBXx4bQD/eLapNg+yErhWHQ0vIQzbVh7gGxsaTcpPHzCqje5Ouk75pD4o9risu9oxMPCsN7+8kbB+7BSUB0xPq7rStn81m5isdqOcIwdjuRMrf5sfRNGKXZCDPlkaCtFETnfFr5+flvYYEoAVLfz9GtQ1ADuXTpksBJUTzl01JQUFBQUFBQqAD4+frV9ff3Px8cFHwnODj4Dn5f8PXxTaowgcjISF9TsOlWzcSad3JeyTmak5NTVKtmrTtmk/nnqlWrBlWISEZ6xozwB8PFyJEj/2ZgYGqHQRHhEQK+lnkVIpKVlbU9Li7ul+zsbG8Do127dt6JCYm305un51eISGZG5g6I3NbvJ5EmKU12uy0QEBYhQkJCRJglTKDChZa0j44FWiKEWyLI6F7dbRK7D0WC0zqK4GYdPSvyn/bOBrim9IzjcnNvcvMhn5LIN5KIfBDIhtpkGUGS1sqqRHQnLKbdzdbWZncVMRhqWFZBq2ZZAGM7YtipZdAC7NDWGGWpWl1gQFcWpbRw+nvNk5k7cW/uSa47M3bf/8wv5+O+5/zP+3Um5zznnDciOlbh/ZxAQxNd8Qj1KSoxkpPbGMlJLuC33n37Gy20tLS0tLS0tLS0HAMFfkeOHMnng9J1RC6eCHWEpfKe2yV8586d22DwUO2cUNQVxqS5LEYPweNLbF+Iunjx4mYD8ULSUpZ7QMGxY8d+YyCCM2s8vi6F9Nu3b59U+0tOTo5lORoyuTDNZ90jTDy++g2BzgTSlMkj5i1Ca+hOET4m7HTc04FtYm8/oNjd6M7/Hhue5CLDQERLVbBSQuKg5tW6CZ8RBvyTgZptEglZBiK26Bxe4MPQY5N0ieeqKPXTmGPtV3eMDWfv1r84qXL2HE3US3ozDhj3Hz427j964iWT+cefRrVrv7xq1J655d2cgJr3konUCaj552qSRR3IGdEF/HlAHXnST9pDlkydIL+R9vkNZSXo4a20tLS0tLS0tHRUW0e1n0NUOygo6La7CHZwUPAdj2OMZtK8eCYs18IGb5vcV3g/J9Awja74p+L93/vcSHuSnOQCfuON2QcttLS0tLS0tLS0tHRU+3sZ1ZZ4FhvdMdzrjph3gPYQ3JQjTnMyGGQmdINc6OyQxgYtBWvTI9jMu6CdpPE8WurQqgIp700UYa3zNJ6bBEFbDB6w6r63TMIg58aNGzvpeJ95NSdCkHdMpE4E3+dpkiV18KQx0H91BFtLS0tLS0tLS+u7JvnMqV9ZWVl2VFTU2sDAwNP+/v7X7Hb7P5n/lBh8P093bsvMzMzp1KlT5ebNmwuJsx+NiYk5lZGRsSM+Pv4wZvdsNpuB0UdMfZr1BetevXoNY0ffkIONLHeDQqE/vHr48OHXc3Nzlyojcra8KQZWiMzJyVnExk/ACA8P38S6cIiGKGgNaVCgzLgFskalo/hGmDUJgMzJkydPZ+d1amPC5V84SWcTs3xu2rxG2tN+fn6XSW83Y2KH7NOnT/+MI7ufmpq6k3qpYGOri1wnQTFPGKh6UXH6V8yY2KD99OnTJ6qNSkpK3mQ5sJH0LSFv3bp1VSp9SEhItRkTP8gYP378UxNyMYhli7v0e/fuHabSR0RE1Jgx8YcsjuwttVFoaOikRtL6QkiXLl3m0co+V+lTUlJKzLauND6ZVcrzD+dpwl/ZkIu0wdAB7VIGUlwLzHbCWCiqrKz8SDrbBy7ShkE+j5JsEhOV84/NNuNg6AKlSUlJf1T9hc421Em6UHiZj4qtpCXeo5FMUA3BrIkvxEABXxMblJCQsEdy9Ff6wxTu1o2IjY2tobnu49mVtWvWrHlj6tSpFdJRrU3p+TZIgFdu3rw5iLj8ElrOGYxukav/ML2DydeJiYlLOZBEyZWTVmiuOcdCLvSF/g7TPpAt9WL16CPSsoOWUnzxkCDT1sDRUzxaWlpaWlpaWlpajvIB68GDB9P5rvZKIqZ/57/Ga3D20aNH61nu5+nOfa9du5ZNgL9i9OjRXfmO8GFC5H+7cuXKZub3EZW7K0H+2Ux8mmMQcPLkyXJ28M3du3d/L0HMLKEjdOXZ+t7nzp2bL0bLmmJggeDz58//WuKIBmHYWomShkBLCIXWkK7MLly48LGBKL43zJr4Qfzq1avf4QGLG/LZ5QNO0vmKWToXSLkcyJcU32WS283GFxPy8vKKOLJ7BJT/cOnSpcFsbHVhFAk5+/fvrzEQB/aK2ac5Wi9ZsuSnBuID05Us+4Mr2SFl3Lhxr0nRvmvGxArxDEb0poFoXQNUPblJHzdkyJC+BuIr1uPNmiRwR6LUQHwie6KbRhJAI5lBK/vUQNevX+9vuri4HleVeZbKPMO2tkaKKo5+87kh4o7RPLN9JAw67tmzZ4L0gfddpA2C9ocOHfrEQFIni1uYlB3aQFcur7eq/kJLG+okXYAy2bZt22x+/zeN5B3Z1mSHlD7AjYI8TiHbpbP9hSY6qa6urpJ14yiaPTSMZRMnTixZtmxZsXRWXzAtX4iADrxklMeDSXMwOEXR1cE9DG/TKM5i+DtuekZKrizQZFmlfto6nLOyZZoJCRAIFk8/UW4BuxRFhAMUp3wDXUtLS0tL60WQ3GqPYLTQvWqEye7du7/tDZMw6EHA4JgyKS0tzfaaCRRCW7CZDWnE8WZylSfj/ZKjEldjZvpCEpTJEKHvuqFacfTo0WmyPAaqoMTpeL/KFQKhACZJouxG6Ah5W7ZsqeBa5ttVq1YVs5wJ3aFAto9zlosIGAgzJZF/IwRC4rRp04bOmTPnJQnn+kE76C3bpzqriygYDB9Komjih7fUvEPINkbKXQ2O+q/BgwePHThw4ID6SJAqbncmMVDmYNILfa3m8/PzV3GhM6NhBdM/DpCbZEdzB5M0V1HpcgeTAiiBHKmHQQ1NMN/BP9udVBNurkkriJMcZjCM9RquWWY7jC37LU31g5EjR5YpE+GlJpk0CJ/HMShtuTSMn8i0x5QpU4aQm8MqfU1NTU8VAW+uSTAXnAkc+fFRo0b9WLUqiJcd9lGnFKmfn0vFN81E+k8MRzlCmXArxOYQI24FPaEfpIG/GZNoeBV+xdMdaz05raxdu3Yu+0l2FrSMgDwYAdXCezAeJsJYE6eZMVAhRWlz1uODpKxzoAherz8yuWNU7IYieBlSIBgszuLwVrBLgmToRRj8txUVFe9LCDbEDcFgbzQWLEYWyVUYZEKGzFvd4CtYxMB0TD5A0NeFWlpaWlrfCVkhmHvEu+VueJU3TIIglXdO/2ygq1evZnrNBLIgytQtXJ6ds/IMXTSjd44yPBB3wEtcDSpsWbBgQczGjRuLDESgZpg7+E9x+K5du6rrl9evXz+EdQWuBhX24WFX//nz53fevn37aHl9MKEREiGFYEAhR123cOHCnizHQwqky6DCcc/konfv3sHz5s3rxXOmvxQTWyP4Q+TWrVsHbNiwoaNE9awQDRkGIjKBoUjky7+joXPnzi3EZJyB5L3fWwZyfDPQQNJcbxC5G0MEr9ghIBDZqAk5CWtg0oHrkn9IaG8FsavJRgPRP/bt3LkzztG83oRmnfqMCVdM4Vwu93UwSYccSJJ6yG1oQnhp26JFi56+QNlck5YQDqEQz/vwC6uqqt5yGMD2JpGgX/Af/0BlIrSrN6EY08yY1MsG4cuXL+/PtCv8QKapFNUPKcovDLR79+5uEhNulomd51AjOfJjp06d+pFUboTsMFOdUqR+3pbfmmziA6FcWpcpk/Lycl+H9S0hDbLF0Na4iTThmTNnFuzYseM9yvoTwwNh8CHhw8RnTLKysoKrq6szFi9ePFBOE8PVaWPFihUjVcB55cqVI9ycZoZzWqlkm2LSJ6nz4DM9Xp1WCgsLIxmrPHXs2LHdnw4nLuKkWTR79uwe7pg1a1YO0wTOHAGYWFyNWmwDO7SCDidOnJhJJxwtob4AN9jB5m7UYh/BAkEQLwSBxSQ+gilZwA+AeS0tLS0tLS0trRdG/wfZthRj/pkm3QAAAABJRU5ErkJggg==" + ")";
        let netchart_sprite = "url(data:image/png;base64," + "iVBORw0KGgoAAAANSUhEUgAAABMAAAFOCAYAAABkNyZRAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo3ZjdhYmNlYi1kY2Y0LTI4NDMtYWVjMC05MzUxNjlmMjI1NTUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTlCNTk1QTI5OUM3MTFFNkFDOEFFMjEyQUNBQUQ3ODQiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTlCNTk1QTE5OUM3MTFFNkFDOEFFMjEyQUNBQUQ3ODQiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Zjk1OGQ5OWYtZmJhMi1iMjQwLWJhZTEtOWY4YmUwNzZlMmMyIiBzdFJlZjpkb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6MzJhNDAxNDgtOTVkYy0xMWU2LWIzMTct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" + ")";
        let css = "";
        css = ".DVSL-suppress-default-styles { color: #abc }";
        css += ".DVSL-container,.DVSL-interaction{-webkit-tap-highlight-color:transparent}.DVSL-font-height,.DVSL-resize-triggers{visibility:hidden}.DVSL-bar-left,.DVSL-bar-right{position:absolute;list-style:none;padding:0;margin:0}.DVSL-bar-left>li,.DVSL-bar-right>li{position:relative;list-style:none!important;min-height:32px;float:left}.DVSL-bar-left.DVSL-bar-vertical>li{clear:left}.DVSL-bar-right.DVSL-bar-vertical>li{float:right;clear:right}.DVSL-bar-left>li a,.DVSL-bar-right>li a{font-family:Arial,Helvetica,sans-serif;font-size:13px;height:32px;line-height:32px;text-decoration:none}.DVSL-bar-left li a p,.DVSL-bar-right li a p{background-image:url(sprite.png);background-repeat:no-repeat;padding:0 0 0 18px;margin:0;float:left;height:37px;line-height:37px;text-indent:4px}.DVSL-bar-bottom>li a span,.DVSL-bar-top>li a span{padding:0 12px 0 0;margin:0;float:right;height:37px}.DVSL-bar-top>li a span{background:url(sprite.png) right 2px no-repeat}.DVSL-bar-bottom>li a span{background:url(sprite.png) 3px 2px no-repeat}.DVSL-bar-dropdown{z-index:2;position:absolute;background:#FFF;display:none;border:1px solid #CCC}.DVSL-bar-top.DVSL-bar-horizontal .DVSL-bar-dropdown{top:32px}.DVSL-bar-bottom.DVSL-bar-horizontal .DVSL-bar-dropdown{bottom:32px}.DVSL-bar-right.DVSL-bar-horizontal .DVSL-bar-dropdown{right:0}.DVSL-bar-left.DVSL-bar-horizontal .DVSL-bar-dropdown{left:0}.DVSL-bar-left.DVSL-bar-vertical .DVSL-bar-dropdown{left:100%}.DVSL-bar-right.DVSL-bar-vertical .DVSL-bar-dropdown{right:100%}.DVSL-bar-top.DVSL-bar-vertical .DVSL-bar-dropdown{top:0}.DVSL-bar-bottom.DVSL-bar-vertical .DVSL-bar-dropdown{bottom:0}.DVSL-bar-dropdown:after{content:\"\";position:absolute;width:0;height:0}.DVSL-bar-top.DVSL-bar-horizontal .DVSL-bar-dropdown:after{top:-7px;border-bottom:7px solid #DDD;border-left:7px solid transparent;border-right:7px solid transparent}.DVSL-bar-bottom.DVSL-bar-horizontal .DVSL-bar-dropdown:after{bottom:-7px;border-top:7px solid #DDD;border-left:7px solid transparent;border-right:7px solid transparent}.DVSL-bar-right.DVSL-bar-horizontal .DVSL-bar-dropdown:after{right:4px}.DVSL-bar-left.DVSL-bar-horizontal .DVSL-bar-dropdown:after{left:6px}.DVSL-bar-left.DVSL-bar-vertical .DVSL-bar-dropdown:after{left:-7px;border-right:7px solid #DDD;border-top:7px solid transparent;border-bottom:7px solid transparent}.DVSL-bar-right.DVSL-bar-vertical .DVSL-bar-dropdown:after{right:-7px;border-left:7px solid #DDD;border-top:7px solid transparent;border-bottom:7px solid transparent}.DVSL-bar-top.DVSL-bar-vertical .DVSL-bar-dropdown:after{top:10px}.DVSL-bar-bottom.DVSL-bar-vertical .DVSL-bar-dropdown:after{bottom:5px}.DVSL-bar-dropdown.DVSL-no-triangle:after{display:none}.DVSL-bar-dropdown ul{margin:0;padding:0;list-style:none;overflow:hidden;min-width:120px}.DVSL-bar-dropdown li a{float:none!important;display:block;border-bottom:none;border-top:none;padding:4px 10px;color:#666;filter:none;background:#FFF;white-space:nowrap;cursor:pointer;opacity:1}div .DVSL-bar-dropdown li a.DVSL-bar-dropdown-active{background:#ddd}div .DVSL-bar-dropdown li a.DVSL-bar-dropdown-disabled{color:#AAA!important;cursor:default}div .DVSL-bar-dropdown li a.DVSL-bar-dropdown-disabled:hover{color:#AAA;background:#FFF}div .DVSL-bar-dropdown li a:hover{color:#fff;background:#09c}.DVSL-bar-btn{white-space:nowrap;color:#333;float:left;padding:0 7px;text-decoration:none;cursor:pointer;opacity:.6}.DVSL-bar-btn:hover{opacity:1}.DVSL-bar-disabled{cursor:default;opacity:.3}.DVSL-bar-disabled:hover{opacity:.3}a.DVSL-bar-btn-none p{padding:0!important;background-image:none!important}a.DVSL-bar-btn-image p{background-position:0 center;min-width:7px}a.DVSL-bar-btn-back p{background-position:-4px -704px}a.DVSL-bar-btn-zoomout p{background-position:-4px -665px}a.DVSL-bar-btn-fullscreen p{background-position:-4px -994px}a.DVSL-bar-btn-fullscreen-active p{background-position:-4px -1058px}a.DVSL-bar-btn-lin p{background-position:-4px -66px}a.DVSL-bar-btn-log p{background-position:-4px -141px}a.DVSL-bar-btn-day p{background-position:-4px -217px}a.DVSL-bar-btn-week p{background-position:-4px -292px}a.DVSL-bar-btn-month p{background-position:-4px -368px}a.DVSL-bar-btn-bars p{background-position:-4px -445px}a.DVSL-bar-btn-children p{background-position:-4px -860px}a.DVSL-bar-btn-export p{background-position:-4px -928px}a.DVSL-bar-btn-fit-active p{background-position:-4px -1123px}a.DVSL-bar-btn-fit p{background-position:-4px -1427px}a.DVSL-bar-btn-rearrange p{background-position:-2px -1351px}a.DVSL-bar-btn-lock-all p{background-position:-2px -1272px}a.DVSL-bar-btn-lock-all-active p{background-position:-2px -1194px}.DVSL-suppress-default-styles{color:rgba(251,64,167,.2)!important;-moz-transition:none!important;-o-transition:none!important;-webkit-transition:none!important;transition:none!important}.DVSL-container{-moz-user-select:none;-ms-user-select:none;-webkit-user-select:none;user-select:none}.DVSL-interaction{outline:0}.DVSL-canvas{image-rendering:optimizeSpeed;image-rendering:-moz-crisp-edges;image-rendering:-webkit-optimize-contrast;image-rendering:-o-crisp-edges;image-rendering:pixelated}.DVSL-menu-container{pointer-events:none}.DVSL-menu-container.DVSL-menu-workaround{box-shadow:none}.DVSL-menu-container>*{pointer-events:auto}.DVSL-menu-container .DVSL-empty{pointer-events:none;font-size:1px}.DVSL-font-height{position:absolute!important;top:-999px!important;clear:both}.DVSL-font-height div{padding:0!important;line-height:1em!important}.DVSL-container .DVSL-background-image{background:center center no-repeat;-webkit-background-size:cover;-moz-background-size:cover;-o-background-size:cover;background-size:cover;position:absolute;overflow:hidden;left:0;right:0;top:0;bottom:0}.DVSL-PC-background-image{-webkit-border-radius:9999px;-moz-border-radius:9999px;border-radius:9999px;background-position:center center;position:absolute;overflow:hidden}.DVSL-container.DVSL-gradient .DVSL-background-image,.DVSL-container.DVSL-round .DVSL-background-image{-webkit-border-top-left-radius:4px;-webkit-border-top-right-radius:4px;-moz-border-radius-topleft:4px;-moz-border-radius-topright:4px;border-top-left-radius:4px;border-top-right-radius:4px}.DVSL-container.DVSL-gradient .DVSL-background{background:#fafafa;background:-moz-linear-gradient(top,#fafafa 0,#bababa 100%);background:-webkit-gradient(linear,left top,left bottom,color-stop(0,#fafafa),color-stop(100,#bababa));background:-webkit-linear-gradient(top,#fafafa 0,#bababa 100%);background:-o-linear-gradient(top,#fafafa 0,#bababa 100%);background:-ms-linear-gradient(top,#fafafa 0,#bababa 100%);background:linear-gradient(to bottom,#fafafa 0,#bababa 100%);filter:progid:DXImageTransform.Microsoft.gradient( startColorstr='#fafafa', endColorstr='#bababa', GradientType=0 );-webkit-border-radius:4px;-moz-border-radius:4px;border-radius:4px}.DVSL-container.DVSL-round .DVSL-background{border:1px solid #DDD;-webkit-border-radius:4px;-moz-border-radius:4px;border-radius:4px}.DVSL-valueAxisInside .DVSL-valueAxis{background-color:rgba(255,255,255,.7)}.DVSL-valueAxisInside .DVSL-valueAxis.DVSL-gradient{-webkit-box-shadow:2px 2px 4px rgba(0,0,0,.5);-moz-box-shadow:2px 2px 4px rgba(0,0,0,.5);box-shadow:2px 2px 4px rgba(0,0,0,.5)}.DVSL-container.DVSL-gradient .DVSL-border{-webkit-border-radius:4px;-moz-border-radius:4px;border-radius:4px;-webkit-box-shadow:inset 0 0 8px rgba(0,0,0,.8);-moz-box-shadow:inset 0 0 8px rgba(0,0,0,.8);box-shadow:inset 0 0 8px rgba(0,0,0,.8)}.DVSL-container.DVSL-flat .DVSL-border{box-shadow:none}.DVSL-hover-right{left:30px;top:10px}.DVSL-hover-left{left:550px;top:10px}.DVSL-hover-center,.DVSL-hover-left,.DVSL-hover-right{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;background:rgba(255,255,255,.95);position:absolute;padding:5px 0}.DVSL-gradient .DVSL-hover-center,.DVSL-gradient .DVSL-hover-left,.DVSL-gradient .DVSL-hover-right{-webkit-border-radius:4px;-moz-border-radius:4px;border-radius:4px}.DVSL-gradient .DVSL-hover-left,.DVSL-gradient .DVSL-hover-right{-webkit-box-shadow:0 0 5px rgba(0,0,0,.5);-moz-box-shadow:0 0 5px rgba(0,0,0,.5);box-shadow:0 0 5px rgba(0,0,0,.5)}.DVSL-flat .DVSL-hover-left,.DVSL-flat .DVSL-hover-right{border:1px solid #DDD}.DVSL-hover-center{left:300px;top:10px;background:rgba(45,136,181,.5);-webkit-box-shadow:none;-moz-box-shadow:none;box-shadow:none}.DVSL-hover-left em,.DVSL-hover-right em{border-top:6px solid transparent;border-bottom:6px solid transparent;top:50%;margin-top:-6px;content:\"\";width:0;height:0;position:absolute}.DVSL-hover-right em{border-right:6px solid #FFF;left:-6px}.DVSL-hover-left em{border-left:6px solid #FFF;right:-6px}.DVSL-flat .DVSL-hover-right em{border-right:6px solid #DDD}.DVSL-flat .DVSL-hover-left em{border-left:6px solid #DDD}.DVSL-hover-left div,.DVSL-hover-right div{float:left;padding:5px 8px;border-right:1px solid #EFEFEF;border-left:1px solid #EFEFEF;margin-left:-1px}.DVSL-hover-center div{padding:0 6px}.DVSL-hover-center div:first-child,.DVSL-hover-left div:first-child,.DVSL-hover-right div:first-child{border-left:none}.DVSL-hover-center div:last-child,.DVSL-hover-left div:last-child,.DVSL-hover-right div:last-child{border-right:none}.DVSL-hover-center p,.DVSL-hover-left p,.DVSL-hover-right p{padding:0;margin:0;font-size:13px}.DVSL-hover-center p{display:none}.DVSL-hover-center strong,.DVSL-hover-left strong,.DVSL-hover-right strong{display:block;font-weight:700;color:#39c;font-size:28px;line-height:28px}.DVSL-hover-center strong{color:#333}.DVSL-gradient .DVSL-hover-center strong{text-shadow:0 1px 0 rgba(255,255,255,.5)}.DVSL-hover-center small,.DVSL-hover-left small,.DVSL-hover-right small{font-size:12px;color:#666}.DVSL-hover-center small{color:#FFF}.DVSL-resizer{position:absolute;display:none;height:1px;width:100%;bottom:0;left:0;background:#FFF;border-bottom:1px dotted #CCC;border-top:1px dotted #CCC}.DVSL-gradient .DVSL-resizer{height:8px;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADC0AAAAICAMAAABQvxTqAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAwUExURUxpcQQEBAQEBAQEBBEREdzc3O7u7gQEBO7u7tvb29LS0vz8/OXl5fHx8aGhoebm5skxTVUAAAAIdFJOUwARMQohpfE1b/FKfQAAAIZJREFUeNrt2UEOgjAURdFfWqCKhf3v1sSZUQdMmlTOuQt4C3gBwCXl1EUOAABgLKlMXZQUAADASHKZ29ZBm4t3AcAXDcBQyrx1MpcEwKByRC4TAFezLq3W2r5W236i+rvXxLJOAAyq5EgVgOs5Hp0cFYBhpcg3AHiznwiAP5Yj7gAAAJ/iCZp5fSq+kErxAAAAAElFTkSuQmCC) top center;border-bottom:none;border-top:none}.DVSL-Menu,.DVSL-info-center,.DVSL-info-left,.DVSL-info-right{background:#efefef;-webkit-box-shadow:0 1px 7px rgba(0,0,0,.6);-moz-box-shadow:0 1px 7px rgba(0,0,0,.6);font-family:Arial,Helvetica,sans-serif}.DVSL-info-center b,.DVSL-info-left b,.DVSL-info-right b{display:block;padding:4px 9px 0;font-weight:400}.DVSL-info-center,.DVSL-info-left,.DVSL-info-right{position:absolute;box-shadow:0 1px 7px rgba(0,0,0,.6);-webkit-border-radius:6px;-moz-border-radius:6px;border-radius:6px;border-bottom:1px solid #FFF;font-size:13px;color:#333;padding-bottom:2px;z-index:1;pointer-events:none}.DVSL-info-center .allow-pointer-events,.DVSL-info-center a,.DVSL-info-center button,.DVSL-info-left .allow-pointer-events,.DVSL-info-left a,.DVSL-info-left button,.DVSL-info-right .allow-pointer-events,.DVSL-info-right a,.DVSL-info-right button{pointer-events:auto}.DVSL-info-center strong,.DVSL-info-left strong,.DVSL-info-right strong{padding:7px 10px;background:#FFF;display:block;border-bottom:1px solid #DDD;-webkit-border-top-left-radius:6px;-webkit-border-top-right-radius:6px;-moz-border-radius-topleft:6px;-moz-border-radius-topright:6px;border-top-left-radius:6px;border-top-right-radius:6px;font-size:15px;color:#000;font-weight:400}.DVSL-info-center strong small,.DVSL-info-left strong small,.DVSL-info-right strong small{display:inline-block;padding-left:5px;font-size:12px;color:#666}.DVSL-info-center h3,.DVSL-info-left h3,.DVSL-info-right h3{padding:6px 7px 5px;margin:0;font-size:12px;font-weight:400;background-color:rgba(0,0,0,.05);border-top:1px solid rgba(0,0,0,.1)}.DVSL-info-center table,.DVSL-info-left table,.DVSL-info-right table{padding:0;margin:0;font-size:12px;width:100%}.DVSL-info-center tr,.DVSL-info-left tr,.DVSL-info-right tr{padding:0;margin:0}.DVSL-info-center tr:nth-child(even),.DVSL-info-left tr:nth-child(even),.DVSL-info-right tr:nth-child(even){background-color:rgba(255,255,255,.5)}.DVSL-info-center td,.DVSL-info-left td,.DVSL-info-right td{border:0 solid transparent;position:relative;padding:3px 5px;color:#666;text-align:right}.DVSL-info-left em,.DVSL-info-right em{border-top:6px solid transparent;border-bottom:6px solid transparent;top:16px;margin-top:-6px}.DVSL-info-left td,.DVSL-info-right td{border-left-width:3px}.DVSL-info-center td:nth-child(even),.DVSL-info-left td:nth-child(even),.DVSL-info-right td:nth-child(even){padding-right:1px}.DVSL-info-center td:nth-child(odd),.DVSL-info-left td:nth-child(odd),.DVSL-info-right td:nth-child(odd){padding-left:1px}.DVSL-info-center td:first-child,.DVSL-info-left td:first-child,.DVSL-info-right td:first-child{padding-left:5px;text-align:left}.DVSL-info-center td:last-child,.DVSL-info-left td:last-child,.DVSL-info-right td:last-child{padding-right:5px;white-space:nowrap}.DVSL-info-left em,.DVSL-info-right em{content:\"\";width:0;height:0;position:absolute}.DVSL-info-right em{border-right:6px solid #FFF;left:-6px}.DVSL-info-left em{border-left:6px solid #FFF;right:-6px}.DVSL-Menu{line-height:140%;box-shadow:0 1px 7px rgba(0,0,0,.6);-webkit-border-radius:6px;-moz-border-radius:6px;border-radius:6px;border-bottom:1px solid #FFF;font-size:13px;color:#333;max-width:600px;z-index:10000}.DVSL-Menu strong{padding:15px 35px 14px 16px;margin:-6px -32px -6px -6px;background:#FFF;display:block;border-bottom:1px solid #DDD;-webkit-border-top-left-radius:6px;-webkit-border-top-right-radius:6px;-moz-border-radius-topleft:6px;-moz-border-radius-topright:6px;border-top-left-radius:6px;border-top-right-radius:6px;font-size:16px;color:#000;font-weight:400}.DVSL-Menu ul{float:left;padding:16px;margin:0;max-width:300px}.DVSL-Menu.NC-with-logo ul{width:270px}.DVSL-Menu li{list-style:none;padding:1px 0 0 80px;clear:both;font-size:12px;color:#333}.DVSL-Menu li span{float:left;margin-left:-80px;color:#666}.DVSL-Menu img{width:180px;height:auto;float:right;padding:16px 16px 12px 0}.DVSL-Menu .clear{clear:both}.DVSL-Menu-details{position:relative;padding:16px 16px 0;min-width:100px}.DVSL-Menu-details small{position:absolute;right:16px;top:-8px;font-size:11px;color:#999;outline:0}.DVSL-Menu-details small:hover{color:#333;cursor:pointer}.DVSL-Menu-details pre{padding:12px;background:#FFF;margin-top:-9px;-webkit-box-shadow:inset 0 0 5px rgba(0,0,0,.7);-moz-box-shadow:inset 0 0 5px rgba(0,0,0,.7);box-shadow:inset 0 0 5px rgba(0,0,0,.7);-webkit-border-radius:4px;-moz-border-radius:4px;border-radius:4px;font-size:12px;white-space:pre-wrap;display:none}.DVSL-Menu nav{background:#e2e2e2;display:block;padding:8px 8px 3px;-webkit-box-shadow:inset 0 2px 2px -1px rgba(0,0,0,.3);-moz-box-shadow:inset 0 2px 2px -1px rgba(0,0,0,.3);box-shadow:inset 0 2px 2px -1px rgba(0,0,0,.3);border-top:1px solid #FFF;-webkit-border-bottom-left-radius:6px;-webkit-border-bottom-right-radius:6px;-moz-border-radius-bottomleft:6px;-moz-border-radius-bottomright:6px;border-bottom-left-radius:6px;border-bottom-right-radius:6px}.DVSL-Menu nav:empty{display:none}.DVSL-Menu nav a{text-decoration:none;text-transform:uppercase;font-size:10px;color:#333;display:inline-block;padding:3px 2px 2px 22px;background-repeat:no-repeat;opacity:.7;position:relative}.DVSL-Menu nav a:hover{color:#000;opacity:1}.DVSL-Menu nav a:hover:after{content:\"\";position:absolute;top:-8px;left:0;right:0;height:2px;background:#09c}.DVSL-Menu b{position:absolute;left:16px;top:-8px;font-size:11px;color:#FFF;background:#C00;padding:0 4px;font-weight:400;-webkit-box-shadow:inset 0 0 5px rgba(0,0,0,.4);-moz-box-shadow:inset 0 0 5px rgba(0,0,0,.4);box-shadow:inset 0 0 5px rgba(0,0,0,.4);-webkit-border-radius:2px;-moz-border-radius:2px;border-radius:2px;z-index:1000}.DVSL-Menu-title{padding:6px 32px 4px 6px;min-height:20px}.DVSL-Menu-close{position:absolute;top:5px;right:5px;text-decoration:none;color:#CCC;border:1px solid #CCC;width:19px;height:19px;text-align:center;-webkit-border-radius:20px;-moz-border-radius:20px;border-radius:20px;font-family:Verdana,Geneva,sans-serif;cursor:pointer}.DVSL-Menu-close::after{font-family:sans-serif;font-size:14px;content:'X';vertical-align:middle}.DVSL-Menu-close:hover{color:#333;border-color:#666}.DVSL-contract-trigger:before,.DVSL-resize-triggers,.DVSL-resize-triggers>div{content:\" \";display:block;position:absolute;top:0;left:0;height:100%;width:100%;overflow:hidden}.DVSL-resize-triggers>div{background:#eee;overflow:hidden}.DVSL-contract-trigger:before{width:200%;height:200%}.DVSL-fullscreen{position:fixed!important;top:0;left:0;bottom:0;right:0;z-index:99999;background:#fff;width:auto!important;height:auto!important}.DVSL-dark .DVSL-bar-dropdown{box-shadow:0 1px 7px rgba(0,0,0,.6);background-color:rgba(22,22,22,.5);border:none}.DVSL-dark .DVSL-bar-dropdown a{background-color:rgba(22,22,22,1)}.DVSL-dark .DVSL-bar-dropdown ul li{display:block;width:100%}.DVSL-dark .DVSL-info-center,.DVSL-dark .DVSL-info-left,.DVSL-dark .DVSL-info-right{border-radius:0;background-color:#000;border-bottom:0}.DVSL-PieChart.DVSL-dark .DVSL-info-center,.DVSL-PieChart.DVSL-dark .DVSL-info-left,.DVSL-PieChart.DVSL-dark .DVSL-info-right{border-radius:6px;background-color:#efefef;border-bottom:1px solid #fff}.DVSL-dark .DVSL-bar-left>li a,.DVSL-dark .DVSL-bar-right>li a{color:#ccc;height:37px}.DVSL-dark .DVSL-bar-left>li a:hover,.DVSL-dark .DVSL-bar-right>li a:hover{opacity:.8}.DVSL-dark .DVSL-info-center strong,.DVSL-dark .DVSL-info-left strong,.DVSL-dark .DVSL-info-right strong{background-color:#333;color:rgba(255,255,255,.9);border-bottom:1px solid #636363}.DVSL-dark .DVSL-info-right em{border-right:6px solid #333}.DVSL-dark .DVSL-info-left em{border-left:6px solid #333}.DVSL-dark .DVSL-info-center small,.DVSL-dark .DVSL-info-left small,.DVSL-dark .DVSL-info-right small{background-color:#333;color:#A8A7A8}.DVSL-dark .DVSL-info-center tr:nth-child(even),.DVSL-dark .DVSL-info-left tr:nth-child(even),.DVSL-dark .DVSL-info-right tr:nth-child(even){background-color:#333}.DVSL-dark .DVSL-info-center tr:nth-child(odd),.DVSL-dark .DVSL-info-left tr:nth-child(odd),.DVSL-dark .DVSL-info-right tr:nth-child(odd){background-color:#000}.DVSL-dark .DVSL-info-center td:nth-child(2),.DVSL-dark .DVSL-info-left td:nth-child(2),.DVSL-dark .DVSL-info-right td:nth-child(2){color:#A8A7A8}.DVSL-dark .DVSL-NC-zoom{background:#525252}a.DVSL-NC-button-collapse,a.DVSL-NC-button-expand,a.DVSL-NC-button-focus,a.DVSL-NC-button-hide,a.DVSL-NC-button-lock,a.DVSL-NC-button-unfocus,a.DVSL-NC-button-unlock{background-image:url(netchart-sprite.png)}.DVSL-dark .DVSL-bar-top>li a span{background-position:-12px -34px}.DVSL-dark a.DVSL-bar-btn-lin p{background-position:-4px -103px}.DVSL-dark a.DVSL-bar-btn-log p{background-position:-4px -178px}.DVSL-dark a.DVSL-bar-btn-month p{background-position:-4px -406px}.DVSL-dark a.DVSL-bar-btn-bars p{background-position:-4px -483px}.DVSL-dark a.DVSL-bar-btn-zoomout p{background-position:-4px -740px}.DVSL-dark a.DVSL-bar-btn-back p{background-position:-4px -780px}.DVSL-dark a.DVSL-bar-btn-export p{background-position:-4px -963px}.DVSL-dark a.DVSL-bar-btn-lock-all p{background-position:-4px -1310px}.DVSL-dark a.DVSL-bar-btn-lock-all-active p{background-position:-4px -1232px}.DVSL-dark a.DVSL-bar-btn-fit-active p{background-position:-4px -1155px}.DVSL-dark a.DVSL-bar-btn-fit p{background-position:-4px -1460px}.DVSL-dark a.DVSL-bar-btn-rearrange p{background-position:-4px -1390px}.DVSL-dark a.DVSL-bar-btn-fullscreen p{background-position:-4px -1025px}.DVSL-dark a.DVSL-bar-btn-fullscreen-active p{background-position:-4px -1090px}.DVSL-leaflet .leaflet-overlay-pane>div:focus{outline:0}a.DVSL-NC-button-expand{background-position:0 0}a.DVSL-NC-button-collapse{background-position:0 -35px}a.DVSL-NC-button-focus{background-position:0 -135px}a.DVSL-NC-button-unfocus{background-position:0 -169px}a.DVSL-NC-button-lock{background-position:2px -103px}a.DVSL-NC-button-unlock{background-position:0 -69px}a.DVSL-NC-button-hide{background-position:1px -202px}.DVSL-NC-zoom{position:relative;display:block;left:15px;width:4px;height:100px;-webkit-border-radius:2px;-moz-border-radius:2px;border-radius:2px;background:#ddd}.DVSL-NC-zoom em{position:absolute;left:-9px;width:22px;height:20px;-webkit-border-radius:99px;-moz-border-radius:99px;border-radius:99px;background:-moz-linear-gradient(top,rgba(0,0,0,.01) 0,rgba(0,0,0,.01) 1%,rgba(0,0,0,.2) 100%);background:-webkit-gradient(linear,left top,left bottom,color-stop(0,rgba(0,0,0,.01)),color-stop(1%,rgba(0,0,0,.01)),color-stop(100%,rgba(0,0,0,.2)));background:-webkit-linear-gradient(top,rgba(0,0,0,.01) 0,rgba(0,0,0,.01) 1%,rgba(0,0,0,.2) 100%);background:-o-linear-gradient(top,rgba(0,0,0,.01) 0,rgba(0,0,0,.01) 1%,rgba(0,0,0,.2) 100%);background:-ms-linear-gradient(top,rgba(0,0,0,.01) 0,rgba(0,0,0,.01) 1%,rgba(0,0,0,.2) 100%);background:linear-gradient(to bottom,rgba(0,0,0,.01) 0,rgba(0,0,0,.01) 1%,rgba(0,0,0,.2) 100%);filter:progid:DXImageTransform.Microsoft.gradient( startColorstr='#03000000', endColorstr='#33000000', GradientType=0 );background-color:#FFF;border-bottom:1px solid rgba(255,255,255,.5);-webkit-box-shadow:0 1px 2px rgba(0,0,0,.8);-moz-box-shadow:0 1px 2px rgba(0,0,0,.8);box-shadow:0 1px 2px rgba(0,0,0,.8);cursor:pointer}.DVSL-NC-zoom em:active,.DVSL-NC-zoom em:hover{background-color:#ddd;-webkit-box-shadow:inset 0 0 5px rgba(0,0,0,.5);-moz-box-shadow:inset 0 0 5px rgba(0,0,0,.5);box-shadow:inset 0 0 5px rgba(0,0,0,.5);border-bottom:1px solid transparent}.DVSL-container.DVSL-gradient .DVSL-TC-timeAxis{background:#cacaca;background:-moz-linear-gradient(top,#cacaca 0,#989898 100%);background:-webkit-gradient(linear,left top,left bottom,color-stop(0,#cacaca),color-stop(100%,#989898));background:-webkit-linear-gradient(top,#cacaca 0,#989898 100%);background:-o-linear-gradient(top,#cacaca 0,#989898 100%);background:-ms-linear-gradient(top,#cacaca 0,#989898 100%);background:linear-gradient(to bottom,#cacaca 0,#989898 100%);filter:progid:DXImageTransform.Microsoft.gradient( startColorstr='#cacaca', endColorstr='#989898', GradientType=0 );border-top:1px solid #c9c9c9;-webkit-box-shadow:0 -2px 4px -1px rgba(0,0,0,.5);-moz-box-shadow:0 -2px 4px -1px rgba(0,0,0,.5);box-shadow:0 -2px 4px -1px rgba(0,0,0,.5);-webkit-border-bottom-right-radius:4px;-webkit-border-bottom-left-radius:4px;-moz-border-radius-bottomright:4px;-moz-border-radius-bottomleft:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}.DVSL-valueAxisInside .DVSL-TC-timeAxis.DVSL-gradient{-webkit-box-shadow:0 -2px 4px -1px rgba(0,0,0,.5);-moz-box-shadow:0 -2px 4px -1px rgba(0,0,0,.5);box-shadow:0 -2px 4px -1px rgba(0,0,0,.5)}";
        css = css.replace(new RegExp("url\\(sprite.png\\)","g"), sprite);
        css = css.replace(new RegExp("url\\(netchart-sprite.png\\)","g"), netchart_sprite);
        style.innerHTML = css;
        target.appendChild(style);
    }

    export function addFreeVersionLogo(settings:any){
        settings.credits = {
            //image: "data:image/png;base64,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",
            image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJ4AAAAtCAYAAABf29KgAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ1dWlkOjU4MDZiZGQ4LWNkOWEtNDY3MS05ZTg1LTcwOWFlZDg0MDY4YyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2NDhGMEQzMUMwQzMxMUU4OTFDREMyMjc3RjVFQjUxQyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NDhGMEQzMEMwQzMxMUU4OTFDREMyMjc3RjVFQjUxQyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNzUwNzVmMi1jYzVlLTg0NGUtYjExOC0wMzc0ZDg0ZGU2ZjkiIHN0UmVmOmRvY3VtZW50SUQ9ImFkb2Jl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",
            enabled: true,
            location: "inside"
        };
    }

    export function handleCreditClick(host:any, e:any,args:any,chart:string){
        let targets = {
            piechart: "zoomcharts.com/powerbi-custom-visuals/donut-chart",
            timechart: "zoomcharts.com/powerbi-custom-visuals/timeline-chart",
            netchart: "zoomcharts.com/powerbi-custom-visuals/network-chart",
            facetchart: "zoomcharts.com/powerbi-custom-visuals/column-chart"
        }

        if (args.clickCredits){
            openURL(host, "https://" + targets[chart]);
            e.preventDefault();
            return false;
        }
    }

    export function updateScale(options: VisualUpdateOptions, chart) {
        //scale:
        let tempViewport: any = options.viewport;
        let tmpScale = 0;
        let scale: any = null;
        if (tempViewport.scale) {
            tmpScale = tempViewport.scale;
            if (tmpScale == 1) {
                scale = true;
            } else if (tmpScale > 0 && tmpScale < 1) {
                scale = tmpScale * 2;
            } else if (tmpScale > 1) {
                if (window.devicePixelRatio) {
                    scale = tmpScale * window.devicePixelRatio;
                } else if (window.window.devicePixelRatio) {
                    scale = tmpScale * window.window.devicePixelRatio;
                } else {
                    scale = tmpScale * 1;
                }
            }
        }

        if (scale) {
            chart.replaceSettings({
                advanced: {
                    highDPI: scale
                }
            });
        }
        return scale;
    }

    export function updateSize(visual, viewport){
        let scale;
        if (typeof(viewport.scale) != "undefined"){
            scale = viewport.scale;
        } else {
            scale = visual.current_scale;
        }

        if (!visual.prev_pixel_ratio){
            visual.prev_pixel_ratio = window.devicePixelRatio;
        }
        if (window.devicePixelRatio != visual.prev_pixel_ratio){
            visual.prev_pixel_ratio = window.devicePixelRatio;
            visual.current_scale = 1;
        }
        visual.prev_pixel_ratio = 2;
        if (scale){
            scale = visual.current_scale = scale;
        } else {
            scale = visual.current_scale;
        }
        let height = viewport.height;
        let width = viewport.width;
        let nh:any = height;
        let nw:any = width;
        if (window.devicePixelRatio == 2){
            if (scale > 1){
                scale = scale;// * window.devicePixelRatio;
                visual.target.style.height =(nh=Math.round(height * scale )) +"px";
                visual.target.style.width = (nw=Math.round(width * scale)) +"px";
                visual.target.style.marginTop = -Math.round((height - height * 1/scale)/2)*scale+"px";
                visual.target.style.marginLeft= -Math.round((width - width *1/scale)/2)*scale +"px"; 
                let t:any;
                visual.target.style.transform = t="scale(" + 1/scale + "," + 1/scale + ")";
            } else {
                visual.target.style.height = height + "px";
                visual.target.style.width = width + "px";
                visual.target.style.marginTop = 0;
                visual.target.style.marginLeft = 0;
                visual.target.style.transform ="scale(" + 1 + "," + 1 + ")";
            }
        } else {
            if (scale > 1){
                visual.target.style.height =(nh=Math.round(height * scale )) +"px";
                visual.target.style.width = (nw=Math.round(width * scale)) +"px";
                visual.target.style.marginTop = -Math.round((height - height * 1/scale)/2*scale)+"px";
                visual.target.style.marginLeft= -Math.round((width - width *1/scale)/2*scale)+"px"; 
                let t:any;
                visual.target.style.transform = t="scale(" + 1/scale + "," + 1/scale + ")";
            } else if(scale <= 1) {
                visual.target.style.height = height + "px";
                visual.target.style.width = width + "px";
                visual.target.style.marginTop = 0;
                visual.target.style.marginLeft = 0;
                visual.target.style.transform ="scale(" + 1 + "," + 1 + ")";
            } 
        }
        if (!chartContainer){
            chartContainer = visual.target.getElementsByClassName("chart-container")[0];
        }
        
        chartContainer.style.height = nh + "px";
        if (messageOverlays){

            if (isDebugVisual){
                console.log("Updating overlays", messageOverlays);
            }
            for (var x = 0; x < messageOverlays.length; x++){
                messageOverlays[x].style.height = nh + "px";
            }
        }

        outerSize = [Math.round(nw),Math.round(nh)];

        visual.chart.updateSize();
    } 

    export function createDataSourceIdentity(dataView: DataView): string {
        if (!dataView || !dataView.metadata || !dataView.metadata.columns.length)
            return "";

        let res = "";

        for (let c of dataView.metadata.columns) {
            res += "//" + JSON.stringify(c.expr) + "/" + c.queryName + "/" + c.index;
            if (c.roles) {
                for (let k of Object.keys(c.roles)) {
                    if (c.roles[k])
                        res += "/" + k;
                }
            }
        }

        return res;
    }

    export function secureString(i: any) {
        if (!i) {
            return i;
        }
        if(typeof i !== "string") {
            return i;
        }
        let s: string = i.replace(/</g, "&lt;").replace(/>/, "&gt;");
        return s;
    }

    export function createColorPalette(host: IVisualHost) {
        let cp = host.colorPalette;

        if ((<any>extensibility).createColorPalette && (<any>cp).colors)
            cp = (<any>extensibility).createColorPalette((<any>cp).colors);

        return cp;
    }

    export function logExceptions(): MethodDecorator {
        return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<Function>)
            : TypedPropertyDescriptor<Function> {

            ///if (!isDebugVisual)
            //    return descriptor;

            return {
                value: function () {
                    try {
                        return descriptor.value.apply(this, arguments);
                    } catch (e) {
                        // alert() seems to be the only way to get something shown in PowerBI desktop
                        // alert(e.toString() + e.stack);
                        console.error(e);
                        throw e;
                    }
                }
            }
        }
    }

    export function arraysEqual<T>(a1: T[], a2: T[], equality: (a: T, b: T) => boolean = (a, b) => a === b) {
        if (a1 === a2) return true;
        if (!Array.isArray(a1) || !Array.isArray(a2)) return false;
        if (a1.length !== a2.length) return false;
        for (let i = 0; i < a1.length; i++) {
            if (!equality(a1[i], a2[i])) return false;
        }
        return true;
    }

    function getColorDirect(category: DataViewCategoryColumn, rowIndex: number, objectName: string): IColorInfo {
        if (!category.objects) return null;
        let a = category.objects[rowIndex];
        if (!a) return null;
        let b = a[objectName];
        if (!b) return null;
        let c = b["fill"];
        if (!c) return null;
        let d = c["solid"];
        if (!d) return null;
        return { value: d.color };
    }

    const cachedCategoryColors: ZoomCharts.Dictionary<{ color: IColorInfo, identity: string }> = {};

    export function getColor(category: DataViewCategoryColumn, rowIndex: number, objectName: string): IColorInfo {
        let color = getColorDirect(category, rowIndex, objectName);
        let foundRowIndex = rowIndex;

        const valueToSearch = category.values[rowIndex];
        if (!color && category.objects) {
            for (let i = 0; i < category.objects.length; i++) {
                if (i !== rowIndex && category.values[i] === valueToSearch) {
                    color = getColorDirect(category, i, objectName);

                    if (color) {
                        foundRowIndex = i;
                        break;
                    }
                }
            }
        }

        let localId = category.source.queryName + "\ufdd0" + valueToSearch + "\ufdd0" + objectName;
        if (!color) {
            let cached = cachedCategoryColors[localId];
            if (cached) {
                color = cached.color;
                for (let id of category.identity) {
                    if (id.key === cached.identity) {
                        // the color seems to be reset
                        color = null;
                        cachedCategoryColors[localId] = null;
                        break;
                    }
                }
            }
        } else {
            cachedCategoryColors[localId] = {
                color: color,
                identity: category.identity[foundRowIndex].key,
            };
        }

        return color;
    }

    export class ColorPaletteWrapper {
        private cache: ZoomCharts.Dictionary<IColorInfo> = Object.create(null);

        public constructor(private inner: IColorPalette) {
        }

        public getColor(key: string) {
            let c = this.cache[key];
            if (c) return c;

            return this.cache[key] = this.inner.getColor(key);
        }

        public setColor(key: string, value: IColorInfo) {
            this.cache[key] = value;
        }
    }

    export function getValue(objects: DataViewObjects, objectName: string, propertyName: string, defaultValue: null) {
        if (objects) {
            let object = objects[objectName];
            if (object) {
                let property = object[propertyName];
                if (property !== undefined) {
                    return property;
                }
            }
        }
        return defaultValue;
    }

    export function registerMessage(elem:HTMLElement){
        messageOverlays.push(elem);

        if (isDebugVisual){
            console.log("Adding new overlay", elem);
        }
    }
    export function displayMessage(target:any, message: string, title: string, settings?: boolean){
        if (!this.infoMessageOverlay){
            this.infoMessageOverlay = document.createElement("div");
            this.infoMessageOverlay.className = "message-overlay";
            this.infoMessageOverlay.style.display = "";

            this.infoMessageTitle = document.createElement("h2");
            this.infoMessageBody = document.createElement("p");
        
            this.infoMessageOverlay.appendChild(this.infoMessageTitle);
            this.infoMessageOverlay.appendChild(this.infoMessageBody);

            target.appendChild(this.infoMessageOverlay);
            registerMessage(this.infoMessageOverlay);
        }

        this.infoMessageTitle.innerHTML = title;
        this.infoMessageBody.innerHTML = message;

        this.infoMessageOverlay.style.display = "block";
    }

    export function hideMessage(target?:any){
        if (this.infoMessageOverlay){
            this.infoMessageOverlay.style.display = "none";
        }
    }

    export class customizationInformer {
        public target: HTMLElement = null;
        public initialCheck: boolean = false;
        public containerClass: string = "message-overlay-get-paid";
        private container: HTMLElement = null;
        public turnOffNextTime: boolean = false;
        public visual: Visual = null;
        public host: IVisualHost;
        public img_element: HTMLElement = null;
        public full_version_logo: HTMLElement = null;
        public enabled: boolean = true;
        
        public options: {
            url: "https://zoomcharts.com",
            images: {
                "600x400": "",
                "500x500": "",
                "400x600": "",
                "300x200": "",
                "200x300": ""
            },
            upgrade_url: ""
        };
        constructor(target, visual: Visual, options?: any) {
            this.target = target;
            this.visual = visual;
            this.host = visual.host;
            this.options = options;

            this.container = document.createElement("div");
            this.container.className = this.containerClass;
            target.appendChild(this.container);

            this.container.style.display = "";

            let span = document.createElement("span");
            span.setAttribute("class", "helper");
            this.container.appendChild(span);

            //add image here:
            this.img_element = document.createElement("img");
            this.img_element.setAttribute("class", "action-btn");
            this.container.appendChild(this.img_element);

            let host = this.host;
            let url = this.options.upgrade_url;
            let fn1 = function () {
                openURL(host, url);
            }
            let el = target.getElementsByClassName("action-btn")[0];
            el.addEventListener("click", fn1);

            registerMessage(this.container);
        }
        public disable() {
            this.enabled = false;
            let container = <HTMLElement>this.target.getElementsByClassName("get-paid-logo")[0];
            if(container) {
                container.parentNode.removeChild(container);
            }
            let container2 = <HTMLElement>this.target.getElementsByClassName(this.containerClass)[0];
            if(container2) {
                container2.parentNode.removeChild(container2);
            }
        }
        public displayDialog() {
            if(!this.enabled) {
                return;
            }
            this.initialCheckDone();
            if (!this.container){
                return;
            }
            this.container.style.display = "block";
        }
        public hideDialog() {
            this.initialCheckDone();
            if (!this.container) {
                return;
            }
            this.container.style.display = "none";
        }
        public hideDialogAndTurnOff() {
            this.setToTurnOff();
            this.hideDialog();
        }
        public isDialogVisible() {
            let container = <HTMLElement>this.target.getElementsByClassName(this.containerClass)[0];
            if (!container) {
                return false;
            } else {
                if (container.style.display == "none") {
                    return false;
                } else {
                    return true;
                }
            }
        }
        public setToTurnOff() {
            this.turnOffNextTime = true;
        }
        public initialCheckDone() {
            if (!this.initialCheck) {
                this.initialCheck = true;
            }
        }
        public updateImage(viewport:any) {
            let img = this.getDimensionImage(viewport);
            this.img_element.setAttribute("src", img);
        }
        public getDimensionImage(viewport:any): string {

            let height = viewport.height;
            let width = viewport.width;
            let aspectRatio = width / height;
            let best = "300x200";
            if (aspectRatio >= 1) {
                if (width >= 600) {
                    if (height >= 600) {
                        best = "600x400";
                    } else if (height >= 500) {
                        best = "500x500";
                    } else if (height >= 400) {
                        best = "600x400";
                    } else if (height >= 300) {
                        best = "200x300";
                    } else {
                        best = "300x200";
                    }
                } else if (width >= 500) {
                    if (height >= 500) {
                        best = "500x500";
                    } else if (height >= 400) {
                        best = "300x200";
                    } else if (height >= 300) {
                        best = "300x200";
                    } else {
                        best = "300x200";
                    }
                } else if (width >= 400) {
                    if (height >= 400) {
                        best = "200x300";
                    } else if (height >= 300) {
                        best = "200x300";
                    } else {
                        best = "300x200";
                    }
                } else if (width >= 300) {
                    if (height >= 300) {
                        best = "200x300";
                    } else {
                        best = "300x200";
                    }
                } else {
                    best = "200x300";
                }
            } else {
                if (width >= 600) {
                    if (height >= 600) {
                        best = "400x600";
                    }
                } else if (width >= 500) {
                    if (height >= 600) {
                        best = "400x600";
                    } else if (height >= 500) {
                        best = "500x500";
                    }
                } else if (width >= 400) {
                    if (height >= 600) {
                        best = "400x600";
                    } else if (height >= 500) {
                        best = "200x300";
                    } else if (height >= 400) {
                        best = "200x300";
                    }
                } else if (width >= 300) {
                    best = "200x300";
                } else {
                    best = "200x300";
                }
            }

            let img = this.options.url + this.options.images[best];
            return img;
        }
    }

    export function openURL(host: IVisualHost, url: string) {
        host.launchUrl(url);
    }
    export function formatText(value:any){
        let s = Math.round(value) + "";
        let l = s.length;
        let m = ["", "k","m","b","t"];
        let max:any = 1;
        let maxIndex:any = 0;
        for (let x = 1; x < m.length; x++){
            let ki:number = x * 3;
            if (s.length > ki){
                maxIndex = x;
            }
        }
        let v:string;
        if (l){
            v = Math.round(value / Math.pow(10, maxIndex*3)*10)/10 + m[maxIndex];
        } else {
            v = Math.round(value * 10)/10 +"";
        }
        return v;
    }

    export function isEmptyObject(obj) {
        for(var prop in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            return false;
          }
        }
        return true;
    }
}
